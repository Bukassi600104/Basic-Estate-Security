import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { requireEstateExists, requireRoleSession } from "@/lib/auth/guards";
import { updateEstate, deleteEstateById, endEstateTrial } from "@/lib/repos/estates";
import { listUsersForEstate } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_status"), status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]) }),
  z.object({ action: z.literal("end_trial") }),
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

  // Try new discriminated schema first, fall back to legacy
  const parsed = patchSchema.safeParse(json) || legacyPatchSchema.safeParse(json);
  const legacy = !patchSchema.safeParse(json).success ? legacyPatchSchema.safeParse(json) : null;

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

  // Delete all Supabase Auth users belonging to this estate
  const users = await listUsersForEstate({ estateId: params.estateId, limit: 500 });
  const sb = getSupabaseAdmin();
  await Promise.allSettled(
    users.map((u) => sb.auth.admin.deleteUser(u.userId))
  );

  // Delete the estate record (cascades to all related DB rows)
  await deleteEstateById(params.estateId);

  return NextResponse.json({ ok: true });
}
