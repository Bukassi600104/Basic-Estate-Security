import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  telegram_id: z.string().min(1),
});

export async function DELETE(req: Request) {
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

  const telegramUserId = parsed.data.telegram_id.trim();

  const user = await prisma.user.findFirst({
    where: { estateId: session.estateId, telegramUserId },
    select: { id: true, residentId: true },
  });

  if (!user || !user.residentId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const remaining = await prisma.user.count({
    where: { estateId: session.estateId, residentId: user.residentId, telegramUserId: { not: null } },
  });

  if (remaining <= 1) {
    return NextResponse.json({ error: "Cannot remove last active ID" }, { status: 409 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { telegramUserId: null, telegramUsername: null } });

  return NextResponse.json({ status: "removed" });
}
