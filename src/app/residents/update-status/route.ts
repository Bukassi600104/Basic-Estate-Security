import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  resident_id: z.string().min(1),
  new_status: z.enum(["Active", "Disabled", "Removed"]),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const residentId = parsed.data.resident_id;

  const resident = await prisma.resident.findFirst({ where: { id: residentId, estateId: session.estateId } });
  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (parsed.data.new_status === "Removed") {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.user.updateMany({
          where: { estateId: session.estateId!, residentId },
          data: { residentId: null, telegramUserId: null, telegramUsername: null },
        });

        const codes = await tx.code.findMany({
          where: { estateId: session.estateId!, residentId },
          select: { id: true },
        });

        if (codes.length) {
          await tx.validationLog.updateMany({
            where: { codeId: { in: codes.map((c) => c.id) } },
            data: { codeId: null },
          });
        }

        await tx.code.deleteMany({ where: { estateId: session.estateId!, residentId } });
        const deleted = await tx.resident.delete({ where: { id: residentId } });

        await tx.activityLog.create({
          data: {
            estateId: session.estateId!,
            type: "RESIDENT_REMOVED",
            message: `Resident removed: ${deleted.name} (House ${deleted.houseNumber})`,
          },
        });
      });

      return NextResponse.json({ status: "updated" });
    }

    const nextStatus = parsed.data.new_status === "Active" ? "APPROVED" : "SUSPENDED";
    const now = new Date();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.resident.update({ where: { id: residentId }, data: { status: nextStatus } });

      if (nextStatus === "SUSPENDED") {
        await tx.code.updateMany({
          where: { estateId: session.estateId!, residentId, status: "ACTIVE" },
          data: { status: "EXPIRED", expiresAt: now },
        });
      }

      await tx.activityLog.create({
        data: {
          estateId: session.estateId!,
          type: "RESIDENT_STATUS_CHANGED",
          message: `Resident status set to ${nextStatus}: ${resident.name} (House ${resident.houseNumber})`,
        },
      });
    });

    return NextResponse.json({ status: "updated" });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    return NextResponse.json({ error: "Backend failure" }, { status: 500 });
  }
}
