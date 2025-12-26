import { NextResponse } from "next/server";
import {
  clearMfaChallengeCookie,
  MFA_CHALLENGE_COOKIE_NAME,
  setAccessCookie,
  setMfaChallengeCookie,
  setRefreshCookie,
  setSessionCookieWithOptions,
  verifySession,
} from "@/lib/auth/session";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { cognitoPasswordSignIn, cognitoRespondToSoftwareTokenMfa } from "@/lib/aws/cognito";
import { getUserById } from "@/lib/repos/users";
import { randomUUID } from "node:crypto";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

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

  const { identifier, password } = parsed.data;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:sign-in:${ip}:${identifier.toLowerCase()}`,
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

  let tokens: { idToken: string; accessToken: string; refreshToken: string };
  try {
    const auth = await cognitoPasswordSignIn({ username: identifier, password });

    if (auth.kind === "CHALLENGE") {
      if (auth.challengeName === "SOFTWARE_TOKEN_MFA") {
        setMfaChallengeCookie(auth.session);
        return NextResponse.json(
          { ok: false, challenge: "SOFTWARE_TOKEN_MFA" },
          { headers: { "Cache-Control": "no-store, max-age=0" } },
        );
      }

      // Unsupported challenge for now.
      console.error("sign_in_unsupported_challenge", JSON.stringify({ debugId, challenge: auth.challengeName }));
      return NextResponse.json({ error: "Sign-in requires additional steps", debugId }, { status: 401 });
    }

    // Successful auth.
    clearMfaChallengeCookie();
    tokens = {
      idToken: auth.idToken,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    };
  } catch (error) {
    const e = error as any;
    const name = typeof e?.name === "string" ? e.name : "UnknownError";
    if (name === "ZodError") {
      console.error(
        "sign_in_failed",
        JSON.stringify({ debugId, name, message: typeof e?.message === "string" ? e.message : "" }),
      );
      return NextResponse.json(
        { error: "Server not configured", debugId },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Store IdToken in the existing session cookie (Cognito-backed now).
  setSessionCookieWithOptions(tokens.idToken, { rememberMe: parsed.data.rememberMe });
  setAccessCookie(tokens.accessToken);
  setRefreshCookie(tokens.refreshToken, { rememberMe: parsed.data.rememberMe });

  // Defensive: ensure we have a user profile; if missing, treat as unauthorized.
  const session = await verifySession(tokens.idToken);
  const profile = await getUserById(session.userId);
  if (!profile) {
    return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

const confirmSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().min(4),
  rememberMe: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const debugId = randomUUID();
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:sign-in:mfa:${ip}:${parsed.data.identifier.toLowerCase()}`,
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

  const challengeSession = cookies().get(MFA_CHALLENGE_COOKIE_NAME)?.value;
  if (!challengeSession) {
    return NextResponse.json({ error: "No pending challenge" }, { status: 409 });
  }

  try {
    const tokens = await cognitoRespondToSoftwareTokenMfa({
      username: parsed.data.identifier,
      session: challengeSession,
      code: parsed.data.code,
    });

    clearMfaChallengeCookie();
    setSessionCookieWithOptions(tokens.idToken, { rememberMe: parsed.data.rememberMe });
    setAccessCookie(tokens.accessToken);
    setRefreshCookie(tokens.refreshToken, { rememberMe: parsed.data.rememberMe });

    const session = await verifySession(tokens.idToken);
    const profile = await getUserById(session.userId);
    if (!profile) {
      return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const e = error as any;
    const name = typeof e?.name === "string" ? e.name : "UnknownError";
    console.error(
      "sign_in_mfa_failed",
      JSON.stringify({ debugId, name, message: typeof e?.message === "string" ? e.message : "" }),
    );
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }
}
