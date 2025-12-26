import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import {
  ACCESS_COOKIE_NAME,
  MFA_SETUP_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearMfaSetupCookie,
  getSession,
  setAccessCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { cookies, headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { cognitoRefreshSession, cognitoVerifyTotpEnrollment } from "@/lib/aws/cognito";
import { verifySession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().min(4).max(12),
});

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:mfa:totp:verify:${ip}:${session.userId}`,
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

  const accessToken = cookies().get(ACCESS_COOKIE_NAME)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  const setupSession = cookies().get(MFA_SETUP_COOKIE_NAME)?.value;
  if (!setupSession) {
    return NextResponse.json({ error: "No pending setup" }, { status: 409 });
  }

  const refreshToken = cookies().get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  try {
    await cognitoVerifyTotpEnrollment({
      accessToken,
      session: setupSession,
      code: parsed.data.code,
    });

    clearMfaSetupCookie();

    // Refresh tokens so the new custom:mfaEnabled claim is reflected
    // in the IdToken used by middleware.
    const refreshed = await cognitoRefreshSession({ refreshToken });
    setSessionCookie(refreshed.idToken);
    setAccessCookie(refreshed.accessToken);

    const refreshedSession = await verifySession(refreshed.idToken);
    if (!refreshedSession.mfaEnabled) {
      return NextResponse.json({ error: "MFA setup incomplete" }, { status: 409 });
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
}
