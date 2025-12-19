import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function DELETE(_req: Request, { params }: { params: { gateId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await prisma.estate.findUnique({ where: { id: session.estateId } });
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const gateId = params.gateId;

  const gate = await prisma.gate.findFirst({ where: { id: gateId, estateId: session.estateId } });
  if (!gate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gateCount = await prisma.gate.count({ where: { estateId: session.estateId } });
  if (gateCount <= 1) {
    return NextResponse.json({ error: "At least one gate is required" }, { status: 400 });
  }

  await prisma.gate.delete({ where: { id: gateId } });

  await prisma.activityLog.create({
    data: {
      estateId: session.estateId,
      type: "GATE_REMOVED",
      message: `Gate removed: ${gate.name}`,
    },
  });

  return NextResponse.json({ ok: true });
}
