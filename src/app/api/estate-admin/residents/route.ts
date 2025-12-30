import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import {
  enforceSameOriginOr403,
  requireActiveEstate,
  requireEstateId,
  requireRoleSession,
} from "@/lib/auth/guards";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { cognitoAdminCreateUser, cognitoAdminGetUserSub } from "@/lib/aws/cognito";
import { putUser, listUsersForResident } from "@/lib/repos/users";
import { createResident, listResidentsForEstate, deleteResident } from "@/lib/repos/residents";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { getEstateById, deriveEstateInitials } from "@/lib/repos/estates";
import { generateVerificationCode } from "@/lib/auth/verification-code";

const bodySchema = z.object({
  residentName: z.string().min(2),
  houseNumber: z.string().min(1),
  residentPhone: z.string().min(6),
  residentEmail: z.string().email().optional().or(z.literal("")),
  approvedPhone1: z.string().min(6).optional().or(z.literal("")),
  approvedPhone2: z.string().min(6).optional().or(z.literal("")),
});

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const rest = Array.from({ length: 10 }, () => pick(upper + lower + digits)).join("");
  return `${pick(upper)}${pick(lower)}${pick(digits)}!${rest}`;
}

async function createCognitoAndProfile(params: {
  estateId: string;
  role: "RESIDENT" | "RESIDENT_DELEGATE";
  name: string;
  email?: string;
  phone: string;
  residentId: string;
}) {
  const password = generatePassword();

  // Cognito is configured with username_attributes = ["email"], so we need an email-like username
  // Use provided email, or generate a unique one from phone number
  const cleanPhone = params.phone.replace(/[^0-9]/g, "");
  const cognitoUsername = params.email || `resident-${cleanPhone}@estate.local`;

  await cognitoAdminCreateUser({
    username: cognitoUsername,
    password,
    email: params.email || `resident-${cleanPhone}@estate.local`,
    phoneNumber: params.phone.startsWith("+") ? params.phone : undefined,
    name: params.name,
    userAttributes: {
      "custom:role": params.role,
      "custom:estateId": params.estateId,
    },
  });

  const sub = await cognitoAdminGetUserSub({ username: cognitoUsername });
  const now = new Date().toISOString();
  await putUser({
    userId: sub,
    estateId: params.estateId,
    role: params.role,
    name: params.name,
    email: params.email,
    phone: params.phone,
    residentId: params.residentId,
    createdAt: now,
    updatedAt: now,
  });

  return { sub, password, cognitoUsername };
}

export async function POST(req: Request) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:residents:onboard:${estateId}:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
    );
  }

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { residentName, houseNumber, residentPhone } = parsed.data;
  const residentEmail = parsed.data.residentEmail ? String(parsed.data.residentEmail).trim() : "";

  const approvedPhones = [parsed.data.approvedPhone1, parsed.data.approvedPhone2]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean);

  // Filter out approved phones that match the resident phone (they can use the resident's own account)
  const uniqueApprovedPhones = approvedPhones.filter((p) => p !== residentPhone.trim());

  if (new Set(uniqueApprovedPhones).size !== uniqueApprovedPhones.length) {
    return NextResponse.json({ error: "Approved numbers must be unique" }, { status: 400 });
  }

  // Get estate to derive verification code
  const estate = await getEstateById(estateId);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }
  // Use stored initials or derive from name (for backward compatibility)
  const estateInitials = estate.initials || deriveEstateInitials(estate.name);
  const verificationCode = generateVerificationCode(estateInitials);

  // 1) Create resident record with verification code.
  const resident = await createResident({
    estateId,
    name: residentName.trim(),
    houseNumber: houseNumber.trim(),
    phone: residentPhone.trim(),
    email: residentEmail || undefined,
    status: "APPROVED",
    verificationCode,
  });

  // 2) Create Cognito users + Dynamo user profiles (linked via residentId).
  let residentPassword: string;
  try {
    const createdResident = await createCognitoAndProfile({
      estateId,
      role: "RESIDENT",
      name: resident.name,
      email: resident.email,
      phone: resident.phone ?? residentPhone.trim(),
      residentId: resident.residentId,
    });
    residentPassword = createdResident.password;

    const delegatePasswords: Array<{ phone: string; password: string; username: string }> = [];
    for (const phone of uniqueApprovedPhones) {
      const createdDelegate = await createCognitoAndProfile({
        estateId,
        role: "RESIDENT_DELEGATE",
        name: `${resident.name} (Delegate)`,
        phone,
        residentId: resident.residentId,
      });
      delegatePasswords.push({ phone, password: createdDelegate.password, username: createdDelegate.cognitoUsername });
    }

    await putActivityLog({
      estateId,
      type: "RESIDENT_ONBOARDED",
      message: `${resident.name} (Unit ${resident.houseNumber})`,
    });

    return NextResponse.json({
      ok: true,
      credentials: {
        resident: {
          name: resident.name,
          username: createdResident.cognitoUsername,
          email: resident.email ?? residentEmail.trim(),
          phone: resident.phone ?? residentPhone.trim(),
          password: residentPassword,
          verificationCode,
        },
        delegates: delegatePasswords,
        verificationCode, // Estate-level code for all users
      },
    });
  } catch (err) {
    const e = err as Error & { name?: string; code?: string; message?: string };
    console.error("resident_onboard_cognito_failed", JSON.stringify({
      errorName: e?.name ?? "Unknown",
      errorMessage: e?.message ?? "Unknown error",
      errorCode: (e as any)?.code ?? null,
      residentPhone: residentPhone.trim(),
      residentEmail: residentEmail || "(not provided)",
    }));

    // Rollback: delete orphaned resident record since Cognito failed
    try {
      await deleteResident(resident.residentId);
      console.log("resident_onboard_rollback_success", JSON.stringify({ residentId: resident.residentId }));
    } catch (rollbackErr) {
      console.error("resident_onboard_rollback_failed", JSON.stringify({
        residentId: resident.residentId,
        error: (rollbackErr as Error)?.message ?? "Unknown",
      }));
    }

    // Provide more helpful error messages based on error type
    if (e?.name === "UsernameExistsException") {
      return NextResponse.json({ error: "A user with this phone number already exists" }, { status: 409 });
    }
    if (e?.name === "InvalidParameterException") {
      return NextResponse.json({ error: "Invalid phone number format. Use international format (e.g., +234...)" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create resident accounts. Please try again." }, { status: 409 });
  }
}

export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const residents = await listResidentsForEstate(estateId, 250);
  const enriched = await Promise.all(
    residents.map(async (r) => {
      const users = await listUsersForResident({ estateId, residentId: r.residentId, limit: 10 });
      return {
        id: r.residentId,
        name: r.name,
        houseNumber: r.houseNumber,
        status: r.status,
        users: users.map((u) => ({
          id: u.userId,
          role: u.role,
          name: u.name,
          phone: u.phone ?? null,
          email: u.email ?? null,
        })),
      };
    }),
  );

  return NextResponse.json({ ok: true, residents: enriched });
}
