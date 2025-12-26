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
import { createResident, listResidentsForEstate } from "@/lib/repos/residents";
import { putActivityLog } from "@/lib/repos/activity-logs";

const bodySchema = z.object({
  residentName: z.string().min(2),
  houseNumber: z.string().min(1),
  residentPhone: z.string().min(6),
  residentEmail: z.string().email(),
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
  username: string;
  name: string;
  email?: string;
  phone?: string;
  residentId: string;
}) {
  const password = generatePassword();

  await cognitoAdminCreateUser({
    username: params.username,
    password,
    email: params.email,
    phoneNumber: params.phone && params.phone.startsWith("+") ? params.phone : undefined,
    name: params.name,
    userAttributes: {
      "custom:role": params.role,
      "custom:estateId": params.estateId,
    },
  });

  const sub = await cognitoAdminGetUserSub({ username: params.username });
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

  return { sub, password };
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
  const residentEmail = String(parsed.data.residentEmail);

  const approvedPhones = [parsed.data.approvedPhone1, parsed.data.approvedPhone2]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean);

  if (approvedPhones.some((p) => p === residentPhone)) {
    return NextResponse.json({ error: "Approved number cannot match resident phone" }, { status: 400 });
  }

  if (new Set(approvedPhones).size !== approvedPhones.length) {
    return NextResponse.json({ error: "Approved numbers must be unique" }, { status: 400 });
  }

  // 1) Create resident record.
  const resident = await createResident({
    estateId,
    name: residentName.trim(),
    houseNumber: houseNumber.trim(),
    phone: residentPhone.trim(),
    email: residentEmail.trim(),
    status: "APPROVED",
  });

  // 2) Create Cognito users + Dynamo user profiles (linked via residentId).
  let residentPassword: string;
  try {
    const createdResident = await createCognitoAndProfile({
      estateId,
      role: "RESIDENT",
      username: residentPhone.trim(),
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      residentId: resident.residentId,
    });
    residentPassword = createdResident.password;

    const delegatePasswords: Array<{ phone: string; password: string }> = [];
    for (const phone of approvedPhones) {
      const createdDelegate = await createCognitoAndProfile({
        estateId,
        role: "RESIDENT_DELEGATE",
        username: phone,
        name: `${resident.name} (Delegate)`,
        phone,
        residentId: resident.residentId,
      });
      delegatePasswords.push({ phone, password: createdDelegate.password });
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
          email: resident.email ?? residentEmail.trim(),
          phone: resident.phone ?? residentPhone.trim(),
          password: residentPassword,
        },
        delegates: delegatePasswords,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to create resident accounts" }, { status: 409 });
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
