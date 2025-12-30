import { NextResponse } from "next/server";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { getSession, ACCESS_COOKIE_NAME, setMfaSetupCookie } from "@/lib/auth/session";
import { headers, cookies } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { cognitoStartTotpEnrollment } from "@/lib/aws/cognito";

export const runtime = "nodejs";

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
    key: `auth:mfa:totp:start:${ip}:${session.userId}`,
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

  const accessToken = cookies().get(ACCESS_COOKIE_NAME)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }

  try {
    const { secretCode, session: enrollmentSession } = await cognitoStartTotpEnrollment({
      accessToken,
    });

    setMfaSetupCookie(enrollmentSession);

    const issuer = "BasicEstateSecurity";
    const label = encodeURIComponent(`${issuer}:${session.name || session.userId}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${encodeURIComponent(secretCode)}&issuer=${encodeURIComponent(issuer)}`;

    return NextResponse.json(
      {
        ok: true,
        secretCode,
        otpauthUrl,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (err) {
    const e = err as Error & { name?: string; code?: string; $metadata?: { httpStatusCode?: number } };
    console.error("mfa_totp_start_failed", JSON.stringify({
      errorName: e?.name ?? "Unknown",
      errorMessage: e?.message ?? "Unknown error",
      errorCode: (e as any)?.code ?? null,
      httpStatusCode: e?.$metadata?.httpStatusCode ?? null,
    }));
    return NextResponse.json(
      { error: `Unable to start MFA setup (${e?.name}: ${e?.message?.slice(0, 100)})` },
      { status: 500 },
    );
  }
}
