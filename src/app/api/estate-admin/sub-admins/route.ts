import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { cognitoAdminCreateUser, cognitoAdminGetUserSub } from "@/lib/aws/cognito";
import {
  putUser,
  listSubAdminsForEstate,
  countAdminsForEstate,
  type SubAdminPermission,
  ALL_SUB_ADMIN_PERMISSIONS,
} from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { getEstateById } from "@/lib/repos/estates";

/**
 * GET /api/estate-admin/sub-admins
 * List all sub-admins for the estate
 */
export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  try {
    // Get estate to check if sub-admin feature is enabled
    const estate = await getEstateById(estateId);
    if (!estate) {
      return NextResponse.json({ error: "Estate not found" }, { status: 404 });
    }

    // Check if sub-admin feature is enabled for this tier
    if (!estate.features?.subAdminEnabled) {
      return NextResponse.json(
        {
          error: "Sub-admin accounts are available on Standard and Premium plans.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const subAdmins = await listSubAdminsForEstate({ estateId, limit: 50 });
    const currentAdminCount = await countAdminsForEstate(estateId);

    return NextResponse.json({
      ok: true,
      subAdmins: subAdmins.map((u) => ({
        userId: u.userId,
        name: u.name,
        email: u.email,
        permissions: u.permissions ?? [],
        createdAt: u.createdAt,
      })),
      canAddMore: currentAdminCount < estate.maxAdmins,
      maxAdmins: estate.maxAdmins,
      currentAdminCount,
    });
  } catch (error) {
    console.error("Failed to list sub-admins:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to list sub-admins" },
      { status: 500 }
    );
  }
}

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  permissions: z.array(z.enum(ALL_SUB_ADMIN_PERMISSIONS as [SubAdminPermission, ...SubAdminPermission[]])).default([]),
});

/**
 * Generate a secure temporary password
 */
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

  const length = 10;
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

/**
 * POST /api/estate-admin/sub-admins
 * Create a new sub-admin
 */
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
    key: `estate-admin:sub-admins:create:${estateId}:${ip}`,
    limit: 5,
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

  const { name, email, permissions } = parsed.data;

  // Get estate to check limits and features
  const estate = await getEstateById(estateId);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }

  // Check if sub-admin feature is enabled
  if (!estate.features?.subAdminEnabled) {
    return NextResponse.json(
      { error: "Sub-admin accounts are available on Standard and Premium plans." },
      { status: 403 }
    );
  }

  // Check if we've reached the admin limit
  const currentAdminCount = await countAdminsForEstate(estateId);
  if (currentAdminCount >= estate.maxAdmins) {
    return NextResponse.json(
      { error: `Admin limit reached (${estate.maxAdmins}). Upgrade to add more.` },
      { status: 403 }
    );
  }

  const tempPassword = generateTempPassword();

  try {
    await cognitoAdminCreateUser({
      username: email,
      password: tempPassword,
      email,
      name,
      userAttributes: {
        "custom:role": "SUB_ADMIN",
        "custom:estateId": estateId,
      },
    });
  } catch (err) {
    console.error("Failed to create sub-admin in Cognito:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UsernameExistsException") || message.includes("already exists")) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Unable to create sub-admin account" },
      { status: 500 }
    );
  }

  const sub = await cognitoAdminGetUserSub({ username: email });
  const now = new Date().toISOString();
  await putUser({
    userId: sub,
    estateId,
    role: "SUB_ADMIN",
    name: name.trim(),
    email,
    permissions,
    createdBy: sessionRes.value.userId,
    createdAt: now,
    updatedAt: now,
  });

  await putActivityLog({
    estateId,
    type: "SUB_ADMIN_CREATED",
    message: `${name} (${email})`,
  });

  return NextResponse.json({
    ok: true,
    tempPassword,
    subAdmin: {
      userId: sub,
      name,
      email,
      permissions,
    },
  });
}
