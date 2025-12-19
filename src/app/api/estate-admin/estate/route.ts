import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  address: z.string().min(2).max(120).optional().or(z.literal("")),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await prisma.estate.findFirst({ where: { id: session.estateId } });
  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ estate });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: any = {};
  if (typeof parsed.data.status === "string") data.status = parsed.data.status;
  if (typeof parsed.data.address === "string") data.address = parsed.data.address.trim() || null;

  const estate = await prisma.estate.update({ where: { id: session.estateId }, data });

  if (data.status) {
    await prisma.activityLog.create({
      data: {
        estateId: session.estateId,
        type: "ESTATE_STATUS_CHANGED",
        message: `Estate status changed to ${data.status}`,
      },
    });
  }

  return NextResponse.json({ ok: true, estate });
}
