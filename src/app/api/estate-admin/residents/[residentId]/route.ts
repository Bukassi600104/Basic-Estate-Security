import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SET_STATUS"), status: z.enum(["APPROVED", "SUSPENDED"]) }),
]);

export async function PATCH(req: Request, { params }: { params: { residentId: string } }) {
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

  const residentId = params.residentId;

  try {
    if (parsed.data.action === "SET_STATUS") {
      const now = new Date();

      const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const resident = await tx.resident.update({
          where: { id: residentId },
          data: { status: parsed.data.status },
        });

        if (parsed.data.status === "SUSPENDED") {
          // Locked rule: expire all ACTIVE codes immediately on suspension.
          await tx.code.updateMany({
            where: {
              estateId: session.estateId!,
              residentId,
              status: "ACTIVE",
            },
            data: {
              status: "EXPIRED",
              expiresAt: now,
            },
          });

          await tx.activityLog.create({
            data: {
              estateId: session.estateId!,
              type: "RESIDENT_STATUS_CHANGED",
              message: `Resident suspended: ${resident.name} (House ${resident.houseNumber})`,
            },
          });
        } else {
          await tx.activityLog.create({
            data: {
              estateId: session.estateId!,
              type: "RESIDENT_STATUS_CHANGED",
              message: `Resident activated: ${resident.name} (House ${resident.houseNumber})`,
            },
          });
        }

        return resident;
      });

      return NextResponse.json({ ok: true, resident: updated });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Failed to update resident" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update resident" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { residentId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const residentId = params.residentId;

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Keep logs (they are snapshots). Unlink users and delete resident + codes.
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

      const resident = await tx.resident.delete({ where: { id: residentId } });

      await tx.activityLog.create({
        data: {
          estateId: session.estateId!,
          type: "RESIDENT_REMOVED",
          message: `Resident removed: ${resident.name} (House ${resident.houseNumber})`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove resident" }, { status: 500 });
  }
}
