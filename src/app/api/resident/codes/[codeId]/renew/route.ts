import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import {
  enforceSameOriginOr403,
  requireActiveEstateForCurrentUser,
  requireCurrentUserResidentContext,
  requireCurrentUserWithRoles,
} from "@/lib/auth/guards";
import { getResidentById } from "@/lib/repos/residents";
import { findCodeById, renewStaffCode } from "@/lib/repos/codes";

const STAFF_TTL_MS = 183 * 24 * 60 * 60 * 1000;

export async function POST(
  req: Request,
  { params }: { params: { codeId: string } }
) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const userRes = await requireCurrentUserWithRoles({ roles: ["RESIDENT", "RESIDENT_DELEGATE"] });
  if (!userRes.ok) return userRes.response;

  const ctx = requireCurrentUserResidentContext(userRes.value);
  if (!ctx.ok) return ctx.response;

  const active = requireActiveEstateForCurrentUser(userRes.value);
  if (!active.ok) return active.response;

  const resident = await getResidentById(ctx.value.residentId);
  if (!resident || resident.estateId !== ctx.value.estateId) {
    return NextResponse.json({ error: "Missing resident context" }, { status: 400 });
  }
  if (resident.status !== "APPROVED") {
    return NextResponse.json({ error: "Resident suspended" }, { status: 403 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `resident:codes:renew:${ip}:${userRes.value.id}`,
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

  const code = await findCodeById({
    estateId: ctx.value.estateId,
    residentId: resident.residentId,
    codeId: params.codeId,
  });

  if (!code) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (code.passType !== "STAFF") {
    return NextResponse.json({ error: "Only staff codes can be renewed" }, { status: 400 });
  }

  if (code.status === "REVOKED" || code.status === "USED") {
    return NextResponse.json({ error: "Code cannot be renewed" }, { status: 409 });
  }

  const now = new Date();
  const newExpiresAtIso = new Date(now.getTime() + STAFF_TTL_MS).toISOString();
  await renewStaffCode({ codeKey: code.codeKey, newExpiresAtIso });

  return NextResponse.json({ ok: true });
}
