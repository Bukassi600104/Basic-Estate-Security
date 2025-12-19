import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]),
});

export async function PATCH(req: Request, { params }: { params: { estateId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const estateId = params.estateId;
  const nextStatus = parsed.data.status;

  const existing = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "TERMINATED" && nextStatus !== "TERMINATED") {
    return NextResponse.json({ error: "Estate is terminated" }, { status: 409 });
  }

  const now = new Date();

  if (nextStatus === "TERMINATED") {
    // Irreversible: mark terminated + revoke access.
    await prisma.$transaction(async (tx) => {
      await tx.estate.update({ where: { id: estateId }, data: { status: "TERMINATED" } });

      // Revoke all active codes immediately.
      await tx.code.updateMany({
        where: { estateId, status: "ACTIVE" },
        data: { status: "REVOKED", expiresAt: now },
      });

      // Unlink Telegram IDs so the bot can't accidentally re-associate.
      await tx.user.updateMany({
        where: { estateId },
        data: { telegramUserId: null, telegramUsername: null },
      });

      await tx.activityLog.create({
        data: {
          estateId,
          type: "ESTATE_STATUS_CHANGED",
          message: "Estate terminated by Super Admin",
        },
      });
    });

    return NextResponse.json({ ok: true });
  }

  await prisma.estate.update({ where: { id: estateId }, data: { status: nextStatus } });
  await prisma.activityLog.create({
    data: {
      estateId,
      type: "ESTATE_STATUS_CHANGED",
      message: `Estate set to ${nextStatus} by Super Admin`,
    },
  });

  return NextResponse.json({ ok: true });
}
