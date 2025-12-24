import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";
import { getEstateById } from "@/lib/repos/estates";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { deleteGate, getGateById, updateGateName } from "@/lib/repos/gates";
import { putActivityLog } from "@/lib/repos/activity-logs";

const patchSchema = z.object({ name: z.string().min(2).max(50) });

export async function PATCH(req: Request, { params }: { params: { gateId: string } }) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const gate = await getGateById(params.gateId);
  if (!gate || gate.estateId !== session.estateId) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }

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
    estateId: session.estateId,
    type: "GATE_UPDATED",
    message: `${gate.name} -> ${updated.name}`,
  });

  return NextResponse.json({ ok: true, gate: { id: updated.gateId, name: updated.name } });
}

export async function DELETE(_req: Request, { params }: { params: { gateId: string } }) {
  try {
    enforceSameOriginForMutations(_req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const gate = await getGateById(params.gateId);
  if (!gate || gate.estateId !== session.estateId) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }

  await deleteGate(params.gateId);
  await putActivityLog({
    estateId: session.estateId,
    type: "GATE_REMOVED",
    message: gate.name,
  });

  return NextResponse.json({ ok: true });
}
