import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { cognitoAdminCreateUser, cognitoAdminGetUserSub } from "@/lib/aws/cognito";
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
    const { items: guards } = await listGuardsForEstatePage({
      estateId,
      limit: 100,
    });

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
    return NextResponse.json(
      { ok: false, error: "Failed to list guards" },
      { status: 500 }
    );
  }
}

const bodySchema = z.object({
  name: z.string().min(2),
  identifier: z.string().min(3),
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
 * Example: "ABbasic3" for "Abubakar Bello" in "Basic Estate"
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

  // For phone-based guards, generate a friendly username
  // For email-based guards, use the email as username
  const friendlyUsername = generateUsername(name, estate.name);
  const cognitoUsername = isEmail ? identifier : `${friendlyUsername}@estate.local`;

  try {
    await cognitoAdminCreateUser({
      username: cognitoUsername,
      password,
      email: isEmail ? identifier : `${friendlyUsername}@estate.local`,
      phoneNumber: !isEmail && identifier.startsWith("+") ? identifier : undefined,
      name,
      userAttributes: {
        "custom:role": "GUARD",
        "custom:estateId": estateId,
      },
    });
  } catch (err) {
    console.error("Failed to create guard in Cognito:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    // Check for common Cognito errors
    if (message.includes("UsernameExistsException") || message.includes("already exists")) {
      return NextResponse.json({ error: "A user with this email or phone already exists" }, { status: 409 });
    }
    if (message.includes("Invalid phone number")) {
      return NextResponse.json({ error: "Invalid phone number format. Use +234XXXXXXXXXX" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create guard account: " + message }, { status: 409 });
  }

  const sub = await cognitoAdminGetUserSub({ username: cognitoUsername });
  const now = new Date().toISOString();
  await putUser({
    userId: sub,
    estateId,
    role: "GUARD",
    name,
    email: isEmail ? identifier : cognitoUsername,
    phone: !isEmail ? identifier : undefined,
    verificationCode,
    createdAt: now,
    updatedAt: now,
  });

  await putActivityLog({
    estateId,
    type: "GUARD_CREATED",
    message: `${name} (${cognitoUsername})`,
  });

  return NextResponse.json({
    ok: true,
    credentials: {
      name,
      identifier: cognitoUsername,
      phone: !isEmail ? identifier : undefined,
      password,
      verificationCode,
    },
  });
}
