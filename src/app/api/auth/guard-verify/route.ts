import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { findEstateByName, deriveEstateInitials } from "@/lib/repos/estates";
import { findGuardByPhoneInEstate, getUserById } from "@/lib/repos/users";
import { validateVerificationCode } from "@/lib/auth/verification-code";
import { cognitoPasswordSignIn } from "@/lib/aws/cognito";
import {
  setAccessCookie,
  setRefreshCookie,
  setSessionCookieWithOptions,
  verifySession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  estateName: z.string().min(2),
  guardName: z.string().min(2),
  phone: z.string().min(6),
  verificationCode: z.string().min(8),
  password: z.string().min(1),
});

/**
 * Fuzzy name matching - checks if names are similar enough.
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

  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

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

  const { estateName, guardName, phone, verificationCode, password } = parsed.data;

  // Rate limit
  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:guard-verify:${ip}:${phone}`,
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

  // 3. Find guard by phone in estate
  const guard = await findGuardByPhoneInEstate({
    estateId: estate.estateId,
    phone,
  });
  if (!guard) {
    return NextResponse.json({ error: "Guard not found" }, { status: 404 });
  }

  // 4. Verify name matches (fuzzy)
  if (!fuzzyNameMatch(guard.name, guardName)) {
    return NextResponse.json({ error: "Name does not match" }, { status: 401 });
  }

  // 5. Authenticate via Cognito
  // Guards can have email or phone as identifier
  const cognitoUsername = guard.email || guard.phone || "";
  if (!cognitoUsername) {
    return NextResponse.json({ error: "Account configuration error" }, { status: 500 });
  }

  let tokens: { idToken: string; accessToken: string; refreshToken: string };
  try {
    const auth = await cognitoPasswordSignIn({
      username: cognitoUsername,
      password,
    });

    if (auth.kind === "CHALLENGE") {
      console.error("guard_verify_unexpected_challenge", JSON.stringify({
        debugId,
        challenge: auth.challengeName,
        guardId: guard.userId,
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
      console.error("guard_verify_aws_error", JSON.stringify({
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

  // 6. Set session cookies
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
    console.error("guard_verify_profile_check_failed", JSON.stringify({
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
