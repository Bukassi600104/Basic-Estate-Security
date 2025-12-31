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

/**
 * Generate a secure password (5-8 characters)
 * Format: Mix of uppercase, lowercase, digits, and special char
 */
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  // Generate 5-8 character password
  const length = 5 + Math.floor(Math.random() * 4); // 5, 6, 7, or 8

  // Ensure at least one of each type for security
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const remaining = length - required.length;
  const all = upper + lower + digits;
  const rest = Array.from({ length: remaining }, () => pick(all));

  // Shuffle the characters
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Generate a username from name and estate (5-8 characters)
 * Format: Initials + estateName + random chars
 * Example: "IKbasicL" for "Ikenna Okoro" in "Basic Estate"
 */
function generateUsername(name: string, estateName: string): string {
  // Get initials from name (first letter of first and last name)
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();

  // Get abbreviated estate name (first word, lowercase)
  const estateWord = estateName.trim().split(/\s+/)[0].toLowerCase().substring(0, 5);

  // Calculate how many random chars we need (target 5-8 total)
  const currentLen = initials.length + estateWord.length;
  const targetLen = Math.max(5, Math.min(8, currentLen + 1));
  const randomLen = Math.max(1, targetLen - currentLen);

  // Generate random suffix
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: randomLen }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  return initials + estateWord + suffix;
}

async function createCognitoAndProfile(params: {
  estateId: string;
  estateName: string;
  role: "RESIDENT" | "RESIDENT_DELEGATE";
  name: string;
  email?: string;
  phone: string;
  residentId: string;
}) {
  const password = generatePassword();

  // Generate friendly username from name + estate
  const friendlyUsername = generateUsername(params.name, params.estateName);

  // Cognito is configured with username_attributes = ["email"], so we need an email-like username
  // Use provided email, or generate a friendly username-based email
  const cognitoUsername = params.email || `${friendlyUsername}@estate.local`;

  await cognitoAdminCreateUser({
    username: cognitoUsername,
    password,
    email: cognitoUsername,
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
      estateName: estate.name,
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
        estateName: estate.name,
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
