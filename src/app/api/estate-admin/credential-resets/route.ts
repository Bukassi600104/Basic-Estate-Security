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
import {
  listResidentsWithCredentialResetRequests,
  clearCredentialResetRequest,
  getResidentById,
} from "@/lib/repos/residents";
import { listUsersForResident, getUserById } from "@/lib/repos/users";
import { cognitoAdminSetPassword } from "@/lib/aws/cognito";
import { getEstateById } from "@/lib/repos/estates";

export const runtime = "nodejs";

/**
 * GET /api/estate-admin/credential-resets
 * List all pending credential reset requests for the estate.
 */
export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  try {
    const residents = await listResidentsWithCredentialResetRequests(estateId);
    return NextResponse.json({
      ok: true,
      requests: residents.map((r) => ({
        residentId: r.residentId,
        name: r.name,
        houseNumber: r.houseNumber,
        phone: r.phone,
        requestedAt: r.credentialResetRequestedAt,
      })),
    });
  } catch (error) {
    console.error("list_credential_resets_error", JSON.stringify({
      estateId,
      error: (error as Error)?.message ?? "",
    }));
    return NextResponse.json({ error: "Failed to list requests" }, { status: 500 });
  }
}

/**
 * Generate a secure password (5-8 characters)
 */
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

const processSchema = z.object({
  residentId: z.string().min(1),
});

/**
 * POST /api/estate-admin/credential-resets
 * Process a credential reset request - generate new password.
 */
export async function POST(req: Request) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:credential-reset:${estateId}:${ip}`,
    limit: 20,
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
      }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = processSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { residentId } = parsed.data;

  // Verify resident belongs to this estate
  const resident = await getResidentById(residentId);
  if (!resident || resident.estateId !== estateId) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  // Get linked users for this resident
  const users = await listUsersForResident({ estateId, residentId, limit: 10 });
  if (users.length === 0) {
    return NextResponse.json({ error: "No user accounts found for this resident" }, { status: 404 });
  }

  // Get estate for name
  const estate = await getEstateById(estateId);

  // Generate new passwords for all linked users
  const newCredentials: Array<{ userId: string; email: string; password: string; role: string }> = [];

  for (const user of users) {
    const newPassword = generatePassword();
    const username = user.email ?? "";

    if (!username) continue;

    try {
      await cognitoAdminSetPassword({ username, password: newPassword });
      newCredentials.push({
        userId: user.userId,
        email: username,
        password: newPassword,
        role: user.role,
      });
    } catch (error) {
      console.error("reset_password_error", JSON.stringify({
        userId: user.userId,
        error: (error as Error)?.message ?? "",
      }));
    }
  }

  if (newCredentials.length === 0) {
    return NextResponse.json({ error: "Failed to reset any credentials" }, { status: 500 });
  }

  // Clear the reset request
  try {
    await clearCredentialResetRequest(residentId);
  } catch (e) {
    // Non-critical
    console.error("clear_reset_request_error", JSON.stringify({
      residentId,
      error: (e as Error)?.message ?? "",
    }));
  }

  return NextResponse.json({
    ok: true,
    resident: {
      name: resident.name,
      houseNumber: resident.houseNumber,
      phone: resident.phone,
    },
    credentials: newCredentials,
  });
}
