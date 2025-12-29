import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertTenant,
  enforceSameOriginOr403,
  requireActiveEstate,
  requireEstateId,
  requireRoleSession,
} from "@/lib/auth/guards";
import { deleteGate, getGateById, updateGateName } from "@/lib/repos/gates";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";

const patchSchema = z.object({ name: z.string().min(2).max(50) });

export async function PATCH(req: Request, { params }: { params: { gateId: string } }) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:gate:patch:${ip}:${params.gateId}`,
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

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const gate = await getGateById(params.gateId);
  const tenant = assertTenant({ entityEstateId: gate?.estateId, sessionEstateId: estateId, notFoundMessage: "Gate not found" });
  if (!tenant.ok) return tenant.response;

  // gate is guaranteed non-null after assertTenant passes
  const oldGateName = gate!.name;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await updateGateName({ gateId: params.gateId, name: parsed.data.name });
  if (!updated) {
    return NextResponse.json({ error: "Unable to update gate" }, { status: 409 });
  }

  await putActivityLog({
    estateId,
    type: "GATE_UPDATED",
    message: `${oldGateName} -> ${updated.name}`,
  });

  return NextResponse.json({ ok: true, gate: { id: updated.gateId, name: updated.name } });
}

export async function DELETE(_req: Request, { params }: { params: { gateId: string } }) {
  const origin = enforceSameOriginOr403(_req);
  if (!origin.ok) return origin.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:gate:delete:${ip}:${params.gateId}`,
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

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const gate = await getGateById(params.gateId);
  const tenant = assertTenant({ entityEstateId: gate?.estateId, sessionEstateId: estateId, notFoundMessage: "Gate not found" });
  if (!tenant.ok) return tenant.response;

  // gate is guaranteed non-null after assertTenant passes
  const gateName = gate!.name;

  await deleteGate(params.gateId);
  await putActivityLog({
    estateId,
    type: "GATE_REMOVED",
    message: gateName,
  });

  return NextResponse.json({ ok: true });
}
