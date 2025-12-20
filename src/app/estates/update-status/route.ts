import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  estate_id: z.string().min(1),
  new_status: z.enum(["Active", "Suspended", "Terminated"]),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const estateId = parsed.data.estate_id;
  const nextStatus =
    parsed.data.new_status === "Active"
      ? "ACTIVE"
      : parsed.data.new_status === "Suspended"
        ? "SUSPENDED"
        : "TERMINATED";

  const existing = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "TERMINATED" && nextStatus !== "TERMINATED") {
    return NextResponse.json({ error: "Estate is terminated" }, { status: 409 });
  }

  const now = new Date();

  if (nextStatus === "TERMINATED") {
    await prisma.$transaction(async (tx) => {
      await tx.estate.update({ where: { id: estateId }, data: { status: "TERMINATED" } });

      await tx.code.updateMany({
        where: { estateId, status: "ACTIVE" },
        data: { status: "REVOKED", expiresAt: now },
      });

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

    return NextResponse.json({ status: "updated" });
  }

  await prisma.estate.update({ where: { id: estateId }, data: { status: nextStatus } });
  await prisma.activityLog.create({
    data: {
      estateId,
      type: "ESTATE_STATUS_CHANGED",
      message: `Estate set to ${nextStatus} by Super Admin`,
    },
  });

  return NextResponse.json({ status: "updated" });
}
