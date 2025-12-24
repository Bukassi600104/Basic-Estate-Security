import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { getEstateById } from "@/lib/repos/estates";
import { updateResidentStatus, deleteResident } from "@/lib/repos/residents";
import { expireActiveCodesForResident } from "@/lib/repos/codes";
import { listUsersForResident, updateUserResidentId } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";

const patchSchema = z.object({
  action: z.literal("SET_STATUS"),
  status: z.enum(["APPROVED", "SUSPENDED"]),
});

export async function PATCH(_req: Request, { params }: { params: { residentId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    enforceSameOriginForMutations(_req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const json = await _req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await updateResidentStatus({ residentId: params.residentId, status: parsed.data.status });
  if (!updated || updated.estateId !== session.estateId) {
    return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  }

  if (parsed.data.status === "SUSPENDED") {
    await expireActiveCodesForResident({ estateId: session.estateId, residentId: params.residentId });
  }

  await putActivityLog({
    estateId: session.estateId,
    type: "RESIDENT_STATUS_UPDATED",
    message: `${updated.name} (Unit ${updated.houseNumber}) -> ${parsed.data.status}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { residentId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    enforceSameOriginForMutations(_req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  // Best-effort: expire codes, unlink users, then delete resident record.
  await expireActiveCodesForResident({ estateId: session.estateId, residentId: params.residentId });

  const linkedUsers = await listUsersForResident({ estateId: session.estateId, residentId: params.residentId, limit: 25 });
  for (const u of linkedUsers) {
    await updateUserResidentId({ userId: u.userId, residentId: null });
  }

  await deleteResident(params.residentId);

  await putActivityLog({
    estateId: session.estateId,
    type: "RESIDENT_REMOVED",
    message: `Resident ${params.residentId} removed`,
  });

  return NextResponse.json({ ok: true });
}
