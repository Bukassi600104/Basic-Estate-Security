import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/repos/users";
import { requestCredentialReset } from "@/lib/repos/residents";

export const runtime = "nodejs";

/**
 * POST /api/resident/request-reset
 * Resident requests a credential reset (password/username).
 * Estate admin will see this request and generate new credentials.
 */
export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only allow RESIDENT and RESIDENT_DELEGATE roles
  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Rate limit
  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `resident:request-reset:${ip}:${session.userId}`,
    limit: 3,
    windowMs: 60_000 * 60, // 3 requests per hour
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

  // Get user to find their residentId
  const user = await getUserById(session.userId);
  if (!user || !user.residentId) {
    return NextResponse.json({ error: "User not linked to resident" }, { status: 404 });
  }

  try {
    await requestCredentialReset(user.residentId);
    return NextResponse.json({ ok: true, message: "Reset request submitted. Your estate admin will contact you with new credentials." });
  } catch (error) {
    console.error("request_credential_reset_error", JSON.stringify({
      userId: session.userId,
      residentId: user.residentId,
      error: (error as Error)?.message ?? "",
    }));
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
