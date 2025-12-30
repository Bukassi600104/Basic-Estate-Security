import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { cognitoAdminCreateUser, cognitoAdminGetUserSub } from "@/lib/aws/cognito";
import { putUser } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { getEstateById, deriveEstateInitials } from "@/lib/repos/estates";
import { generateVerificationCode } from "@/lib/auth/verification-code";

const bodySchema = z.object({
  name: z.string().min(2),
  identifier: z.string().min(3),
});

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const rest = Array.from({ length: 10 }, () => pick(upper + lower + digits)).join("");
  return `${pick(upper)}${pick(lower)}${pick(digits)}!${rest}`;
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
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
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

  // Get estate to derive verification code
  const estate = await getEstateById(estateId);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }
  // Use stored initials or derive from name (for backward compatibility)
  const estateInitials = estate.initials || deriveEstateInitials(estate.name);
  const verificationCode = generateVerificationCode(estateInitials);

  try {
    await cognitoAdminCreateUser({
      username: identifier,
      password,
      email: isEmail ? identifier : undefined,
      phoneNumber: !isEmail && identifier.startsWith("+") ? identifier : undefined,
      name,
      userAttributes: {
        "custom:role": "GUARD",
        "custom:estateId": estateId,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to create guard account" }, { status: 409 });
  }

  const sub = await cognitoAdminGetUserSub({ username: identifier });
  const now = new Date().toISOString();
  await putUser({
    userId: sub,
    estateId,
    role: "GUARD",
    name,
    email: isEmail ? identifier : undefined,
    phone: !isEmail ? identifier : undefined,
    verificationCode,
    createdAt: now,
    updatedAt: now,
  });

  await putActivityLog({
    estateId,
    type: "GUARD_CREATED",
    message: `${name} (${identifier})`,
  });

  return NextResponse.json({
    ok: true,
    credentials: { name, identifier, password, verificationCode },
  });
}
