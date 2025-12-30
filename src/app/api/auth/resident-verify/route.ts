import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { findEstateByName, deriveEstateInitials } from "@/lib/repos/estates";
import { findResidentByPhoneInEstate } from "@/lib/repos/residents";
import { listUsersForResident } from "@/lib/repos/users";
import { validateVerificationCode } from "@/lib/auth/verification-code";
import { cognitoPasswordSignIn } from "@/lib/aws/cognito";
import {
  setAccessCookie,
  setRefreshCookie,
  setSessionCookieWithOptions,
  verifySession,
} from "@/lib/auth/session";
import { getUserById } from "@/lib/repos/users";

export const runtime = "nodejs";

const bodySchema = z.object({
  estateName: z.string().min(2),
  residentName: z.string().min(2),
  phone: z.string().min(6),
  verificationCode: z.string().min(8),
  password: z.string().min(1),
});

/**
 * Fuzzy name matching - checks if names are similar enough.
 * Normalizes and compares first/last name parts.
 */
function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  // Exact match after normalization
  if (na === nb) return true;

  // Check if one contains the other (handles middle names)
  if (na.includes(nb) || nb.includes(na)) return true;

  // Check first name match
  const partsA = na.split(" ");
  const partsB = nb.split(" ");
  if (partsA[0] === partsB[0]) return true;

  return false;
}

export async function POST(req: Request) {
  const debugId = randomUUID();

  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { estateName, residentName, phone, verificationCode, password } = parsed.data;

  // Rate limit
  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:resident-verify:${ip}:${phone}`,
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
      }
    );
  }

  // 1. Find estate by name
  const estate = await findEstateByName(estateName);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }

  // Check estate is active
  if (estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate is not active" }, { status: 403 });
  }

  // 2. Validate verification code
  const estateInitials = estate.initials || deriveEstateInitials(estate.name);
  if (!validateVerificationCode(verificationCode, estateInitials)) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  // 3. Find resident by phone in estate
  const resident = await findResidentByPhoneInEstate({
    estateId: estate.estateId,
    phone,
  });
  if (!resident) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  // Check resident status
  if (resident.status !== "APPROVED") {
    return NextResponse.json({ error: "Your account is not active. Please contact your estate admin." }, { status: 403 });
  }

  // 4. Verify name matches (fuzzy)
  if (!fuzzyNameMatch(resident.name, residentName)) {
    return NextResponse.json({ error: "Name does not match" }, { status: 401 });
  }

  // 5. Find user account for this resident
  const users = await listUsersForResident({
    estateId: estate.estateId,
    residentId: resident.residentId,
    limit: 10,
  });

  // Find the main resident user (not delegate)
  const residentUser = users.find((u) => u.role === "RESIDENT") || users[0];
  if (!residentUser) {
    return NextResponse.json({ error: "Account not found. Please contact your estate admin." }, { status: 404 });
  }

  // 6. Authenticate via Cognito
  // Determine the Cognito username (email or generated email-like username)
  const cognitoUsername = residentUser.email || `resident-${phone.replace(/[^0-9]/g, "")}@estate.local`;

  let tokens: { idToken: string; accessToken: string; refreshToken: string };
  try {
    const auth = await cognitoPasswordSignIn({
      username: cognitoUsername,
      password,
    });

    if (auth.kind === "CHALLENGE") {
      // Residents shouldn't have MFA enabled, but handle gracefully
      console.error("resident_verify_unexpected_challenge", JSON.stringify({
        debugId,
        challenge: auth.challengeName,
        residentId: resident.residentId,
      }));
      return NextResponse.json({ error: "Additional verification required. Please use the main sign-in page." }, { status: 401 });
    }

    tokens = {
      idToken: auth.idToken,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    };
  } catch (error) {
    const e = error as any;
    const name = typeof e?.name === "string" ? e.name : "UnknownError";

    if (name === "CredentialsProviderError") {
      console.error("resident_verify_aws_error", JSON.stringify({
        debugId,
        name,
        message: e?.message ?? "",
      }));
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // 7. Set session cookies
  setSessionCookieWithOptions(tokens.idToken, { rememberMe: false });
  setAccessCookie(tokens.accessToken);
  setRefreshCookie(tokens.refreshToken, { rememberMe: false });

  // Verify profile exists
  try {
    const session = await verifySession(tokens.idToken);
    const profile = await getUserById(session.userId);
    if (!profile) {
      return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
    }
  } catch (error) {
    console.error("resident_verify_profile_check_failed", JSON.stringify({
      debugId,
      error: (error as Error)?.message ?? "",
    }));
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
