import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertTenant,
  enforceSameOriginOr403,
  requireActiveEstate,
  requireEstateId,
  requireRoleSession,
} from "@/lib/auth/guards";
import { getResidentById, updateResidentStatus, deleteResident } from "@/lib/repos/residents";
import { expireActiveCodesForResident } from "@/lib/repos/codes";
import { listUsersForResident, updateUserResidentId } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";

const patchSchema = z.object({
  action: z.literal("SET_STATUS"),
  status: z.enum(["APPROVED", "SUSPENDED"]),
});

export async function PATCH(_req: Request, { params }: { params: { residentId: string } }) {
  const origin = enforceSameOriginOr403(_req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:resident:patch:${ip}:${sessionRes.value.userId}:${params.residentId}`,
    limit: 60,
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

  // Tenant boundary: verify resident belongs to this estate before mutating.
  const existing = await getResidentById(params.residentId);
  const tenant = assertTenant({
    entityEstateId: existing?.estateId,
    sessionEstateId: estateId,
    notFoundMessage: "Resident not found",
  });
  if (!tenant.ok) return tenant.response;

  const json = await _req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await updateResidentStatus({ residentId: params.residentId, status: parsed.data.status });
  const updatedTenant = assertTenant({
    entityEstateId: updated?.estateId,
    sessionEstateId: estateId,
    notFoundMessage: "Resident not found",
  });
  if (!updatedTenant.ok) return updatedTenant.response;
  if (!updated) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  if (parsed.data.status === "SUSPENDED") {
    await expireActiveCodesForResident({ estateId, residentId: params.residentId });
  }

  await putActivityLog({
    estateId,
    type: "RESIDENT_STATUS_UPDATED",
    message: `${updated.name} (Unit ${updated.houseNumber}) -> ${parsed.data.status}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { residentId: string } }) {
  const origin = enforceSameOriginOr403(_req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:resident:delete:${ip}:${sessionRes.value.userId}:${params.residentId}`,
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

  // Tenant boundary: verify resident belongs to this estate before deleting.
  const existing = await getResidentById(params.residentId);
  const tenant = assertTenant({
    entityEstateId: existing?.estateId,
    sessionEstateId: estateId,
    notFoundMessage: "Resident not found",
  });
  if (!tenant.ok) return tenant.response;

  // Best-effort: expire codes, unlink users, then delete resident record.
  await expireActiveCodesForResident({ estateId, residentId: params.residentId });

  const linkedUsers = await listUsersForResident({ estateId, residentId: params.residentId, limit: 25 });
  for (const u of linkedUsers) {
    await updateUserResidentId({ userId: u.userId, residentId: null });
  }

  await deleteResident(params.residentId);

  await putActivityLog({
    estateId,
    type: "RESIDENT_REMOVED",
    message: `Resident ${params.residentId} removed`,
  });

  return NextResponse.json({ ok: true });
}
