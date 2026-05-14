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
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  const length = 5 + Math.floor(Math.random() * 4);
  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const remaining = length - required.length;
  const all = upper + lower + digits;
  const rest = Array.from({ length: remaining }, () => pick(all));

  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

function generateUsername(name: string, estateName: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();

  const estateWord = estateName.trim().split(/\s+/)[0].toLowerCase().substring(0, 5);

  const currentLen = initials.length + estateWord.length;
  const targetLen = Math.max(5, Math.min(8, currentLen + 1));
  const randomLen = Math.max(1, targetLen - currentLen);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: randomLen }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  return initials + estateWord + suffix;
}

async function createAuthAndProfile(params: {
  estateId: string;
  estateName: string;
  role: "RESIDENT" | "RESIDENT_DELEGATE";
  name: string;
  email?: string;
  phone: string;
  residentId: string;
}) {
  const password = generatePassword();
  const friendlyUsername = generateUsername(params.name, params.estateName);
  const authEmail = params.email || `${friendlyUsername}.${Date.now().toString(36)}@estate.local`;

  const sbAdmin = getSupabaseAdmin();
  const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { name: params.name, role: params.role, estate_id: params.estateId },
  });

  if (authError) throw authError;

  const now = new Date().toISOString();
  await putUser({
    userId: authData.user.id,
    estateId: params.estateId,
    role: params.role,
    name: params.name,
    email: params.email,
    phone: params.phone,
    residentId: params.residentId,
    createdAt: now,
    updatedAt: now,
  });

  return { userId: authData.user.id, password, authEmail };
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

  const uniqueApprovedPhones = approvedPhones.filter((p) => p !== residentPhone.trim());

  if (new Set(uniqueApprovedPhones).size !== uniqueApprovedPhones.length) {
    return NextResponse.json({ error: "Approved numbers must be unique" }, { status: 400 });
  }

  const estate = await getEstateById(estateId);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }
  const estateInitials = estate.initials || deriveEstateInitials(estate.name);
  const verificationCode = generateVerificationCode(estateInitials);

  const resident = await createResident({
    estateId,
    name: residentName.trim(),
    houseNumber: houseNumber.trim(),
    phone: residentPhone.trim(),
    email: residentEmail || undefined,
    status: "APPROVED",
    verificationCode,
  });

  try {
    const createdResident = await createAuthAndProfile({
      estateId,
      estateName: estate.name,
      role: "RESIDENT",
      name: resident.name,
      email: resident.email,
      phone: resident.phone ?? residentPhone.trim(),
      residentId: resident.residentId,
    });

    const delegatePasswords: Array<{ phone: string; password: string; username: string }> = [];
    for (const phone of uniqueApprovedPhones) {
      const createdDelegate = await createAuthAndProfile({
        estateId,
        estateName: estate.name,
        role: "RESIDENT_DELEGATE",
        name: `${resident.name} (Delegate)`,
        phone,
        residentId: resident.residentId,
      });
      delegatePasswords.push({ phone, password: createdDelegate.password, username: createdDelegate.authEmail });
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
          username: createdResident.authEmail,
          email: resident.email ?? residentEmail.trim(),
          phone: resident.phone ?? residentPhone.trim(),
          password: createdResident.password,
          verificationCode,
        },
        delegates: delegatePasswords,
        verificationCode,
      },
    });
  } catch (err) {
    const e = err as Error & { message?: string; code?: string; status?: number };
    console.error("resident_onboard_failed", { message: e?.message, code: e?.code, status: e?.status });

    try {
      await deleteResident(resident.residentId);
    } catch (rollbackErr) {
      console.error("resident_onboard_rollback_failed", (rollbackErr as Error)?.message);
    }

    if (e?.message?.includes("already been registered") || e?.message?.includes("already exists")) {
      return NextResponse.json({ error: "A user with this phone number already exists" }, { status: 409 });
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
