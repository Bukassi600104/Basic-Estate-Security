import { NextResponse } from "next/server";
import {
  clearAccessCookie,
  clearMfaChallengeCookie,
  clearMfaSetupCookie,
  clearRefreshCookie,
  clearSessionCookie,
} from "@/lib/auth/session";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `auth:sign-out:${ip}`,
    limit: 30,
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

  clearSessionCookie();
  clearAccessCookie();
  clearRefreshCookie();
  clearMfaChallengeCookie();
  clearMfaSetupCookie();
  return NextResponse.json({ ok: true });
}
