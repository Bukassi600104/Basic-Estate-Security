import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { putUser, listGuardsForEstatePage } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { getEstateById, deriveEstateInitials } from "@/lib/repos/estates";
import { generateVerificationCode } from "@/lib/auth/verification-code";

export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  try {
    const { items: guards } = await listGuardsForEstatePage({ estateId, limit: 100 });

    return NextResponse.json({
      ok: true,
      guards: guards.map((g) => ({
        userId: g.userId,
        name: g.name,
        email: g.email,
        phone: g.phone,
        verificationCode: g.verificationCode,
        createdAt: g.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to list guards:", error);
    return NextResponse.json({ ok: false, error: "Failed to list guards" }, { status: 500 });
  }
}

const bodySchema = z.object({
  name: z.string().min(2),
  identifier: z.string().min(3),
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
    key: `estate-admin:guards:create:${estateId}:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      { status: rl.status, headers: { "Cache-Control": "no-store, max-age=0", ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const identifier = parsed.data.identifier.trim();
  const isEmail = identifier.includes("@");
  const password = generatePassword();

  const estate = await getEstateById(estateId);
  if (!estate) return NextResponse.json({ error: "Estate not found" }, { status: 404 });

  const estateInitials = estate.initials || deriveEstateInitials(estate.name);
  const verificationCode = generateVerificationCode(estateInitials);

  const friendlyUsername = generateUsername(name, estate.name);
  const guardEmail = isEmail ? identifier : `${friendlyUsername}@estate.local`;

  try {
    const sbAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
      email: guardEmail,
      password,
      email_confirm: true,
      user_metadata: { name, role: "GUARD", estate_id: estateId },
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json({ error: "A user with this email or phone already exists" }, { status: 409 });
      }
      throw authError;
    }

    const now = new Date().toISOString();
    await putUser({
      userId: authData.user.id,
      estateId,
      role: "GUARD",
      name,
      authEmail: guardEmail,
      email: guardEmail,
      phone: !isEmail ? identifier : undefined,
      verificationCode,
      createdAt: now,
      updatedAt: now,
    });

    await putActivityLog({ estateId, type: "GUARD_CREATED", message: `${name} (${guardEmail})` });

    return NextResponse.json({
      ok: true,
      credentials: {
        name,
        identifier: guardEmail,
        phone: !isEmail ? identifier : undefined,
        password,
        verificationCode,
      },
    });
  } catch (err) {
    console.error("Failed to create guard:", err);
    return NextResponse.json({ error: "Unable to create guard account" }, { status: 409 });
  }
}
