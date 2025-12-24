import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { getEstateById, updateEstate } from "@/lib/repos/estates";
import { putActivityLog } from "@/lib/repos/activity-logs";

const bodySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]),
});

export async function PATCH(req: Request, { params }: { params: { estateId: string } }) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await getEstateById(params.estateId);
  if (!existing) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }

  const updated = await updateEstate({ estateId: params.estateId, status: parsed.data.status });
  if (!updated) {
    return NextResponse.json({ error: "Unable to update estate" }, { status: 409 });
  }

  await putActivityLog({
    estateId: params.estateId,
    type: "ESTATE_STATUS_UPDATED",
    message: `${existing.status} -> ${updated.status}`,
  });

  return NextResponse.json({ ok: true, estate: { id: updated.estateId, status: updated.status } });
}
