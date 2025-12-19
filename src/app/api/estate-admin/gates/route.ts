import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

const createSchema = z.object({ name: z.string().min(2).max(50) });

export async function GET() {
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

  const gates = await prisma.gate.findMany({
    where: { estateId: session.estateId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ gates });
}

export async function POST(req: Request) {
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

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const gate = await prisma.gate.create({
      data: { estateId: session.estateId, name: parsed.data.name.trim() },
    });

    await prisma.activityLog.create({
      data: {
        estateId: session.estateId,
        type: "GATE_CREATED",
        message: `Gate created: ${gate.name}`,
      },
    });

    return NextResponse.json({ ok: true, gate });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Gate name already exists" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to create gate" }, { status: 500 });
  }
}
