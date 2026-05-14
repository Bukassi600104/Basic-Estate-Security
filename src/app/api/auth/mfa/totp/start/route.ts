import { NextResponse } from "next/server";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { getSession } from "@/lib/auth/session";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { createSupabaseServerClient } from "@/lib/supabase/client";

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

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

    if (error) throw error;

    const issuer = "GatePilot";
    const label = encodeURIComponent(`${issuer}:${session.name || session.userId}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${encodeURIComponent(data.totp.secret)}&issuer=${encodeURIComponent(issuer)}`;

    return NextResponse.json(
      { ok: true, secretCode: data.totp.secret, otpauthUrl, factorId: data.id },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (err) {
    console.error("mfa_totp_start_failed", (err as Error)?.message);
    return NextResponse.json({ error: "Unable to start MFA setup. Please try again later." }, { status: 500 });
  }
}
