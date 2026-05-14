import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { requireEstateExists, requireRoleSession } from "@/lib/auth/guards";
import { endEstateTrial, extendEstateTrial, terminateEstateById, updateEstate } from "@/lib/repos/estates";
import { putActivityLog } from "@/lib/repos/activity-logs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_status"), status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]) }),
  z.object({ action: z.literal("end_trial") }),
  z.object({ action: z.literal("extend_trial"), days: z.number().int().min(1).max(365).default(90) }),
  z.object({ action: z.literal("mark_pilot"), pilot: z.boolean() }),
]);

// Backwards-compatible: if no action field, treat as set_status
const legacyPatchSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]) });

async function getRateLimitKey(suffix: string, ip: string, userId: string) {
  return `super-admin:estates:${suffix}:${ip}:${userId}`;
}

export async function PATCH(req: Request, { params }: { params: { estateId: string } }) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;
  const session = sessionRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: await getRateLimitKey(`patch:${params.estateId}`, ip, session.userId),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: rl.status, headers: rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {} });
  }

  const json = await req.json().catch(() => null);

  const existingRes = await requireEstateExists(params.estateId);
  if (!existingRes.ok) return existingRes.response;
  const existing = existingRes.value;

  // Handle end_trial action
  const newParsed = patchSchema.safeParse(json);
  if (newParsed.success && newParsed.data.action === "end_trial") {
    const updated = await endEstateTrial(params.estateId);
    if (!updated) return NextResponse.json({ error: "Failed to end trial" }, { status: 500 });
    await putActivityLog({ estateId: params.estateId, type: "ESTATE_STATUS_UPDATED", message: `Trial ended early by super admin` });
    return NextResponse.json({ ok: true, estate: { id: updated.estateId, subscriptionStatus: updated.subscriptionStatus } });
  }

  if (newParsed.success && newParsed.data.action === "extend_trial") {
    const updated = await extendEstateTrial({
      estateId: params.estateId,
      days: newParsed.data.days,
      trialType: "PILOT",
    });
    if (!updated) return NextResponse.json({ error: "Failed to extend trial" }, { status: 500 });
    await putActivityLog({
      estateId: params.estateId,
      type: "ESTATE_STATUS_UPDATED",
      message: `Pilot trial extended by ${newParsed.data.days} days by super admin`,
    });
    return NextResponse.json({
      ok: true,
      estate: {
        id: updated.estateId,
        subscriptionStatus: updated.subscriptionStatus,
        trialEndsAt: updated.trialEndsAt,
        trialType: updated.trialType,
      },
    });
  }

  if (newParsed.success && newParsed.data.action === "mark_pilot") {
    const updated = await updateEstate({
      estateId: params.estateId,
      trialType: newParsed.data.pilot ? "PILOT" : "STANDARD",
    });
    if (!updated) return NextResponse.json({ error: "Failed to update pilot status" }, { status: 500 });
    await putActivityLog({
      estateId: params.estateId,
      type: "ESTATE_STATUS_UPDATED",
      message: newParsed.data.pilot ? "Marked as pilot estate" : "Removed pilot estate mark",
    });
    return NextResponse.json({ ok: true, estate: { id: updated.estateId, trialType: updated.trialType } });
  }

  // Handle set_status or legacy status update
  let status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  if (newParsed.success && newParsed.data.action === "set_status") {
    status = newParsed.data.status;
  } else {
    const leg = legacyPatchSchema.safeParse(json);
    if (!leg.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    status = leg.data.status;
  }

  const updated = await updateEstate({ estateId: params.estateId, status });
  if (!updated) return NextResponse.json({ error: "Unable to update estate" }, { status: 409 });

  await putActivityLog({ estateId: params.estateId, type: "ESTATE_STATUS_UPDATED", message: `${existing.status} -> ${updated.status}` });

  return NextResponse.json({ ok: true, estate: { id: updated.estateId, status: updated.status } });
}

export async function DELETE(req: Request, { params }: { params: { estateId: string } }) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;
  const session = sessionRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: await getRateLimitKey(`delete:${params.estateId}`, ip, session.userId),
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: rl.status });
  }

  const existingRes = await requireEstateExists(params.estateId);
  if (!existingRes.ok) return existingRes.response;

  const updated = await terminateEstateById(params.estateId);
  if (!updated) {
    return NextResponse.json({ error: "Unable to terminate estate" }, { status: 409 });
  }

  await putActivityLog({
    estateId: params.estateId,
    type: "ESTATE_STATUS_UPDATED",
    message: "Estate terminated by super admin",
  });

  return NextResponse.json({ ok: true });
}
