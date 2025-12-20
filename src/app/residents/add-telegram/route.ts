import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

const bodySchema = z.object({
  resident_id: z.string().min(1),
  telegram_id: z.string().min(1),
  approved_by_admin_id: z.string().min(1).optional(),
});

function generatePassword() {
  return nanoid(12);
}

export async function POST(req: Request) {
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

  if (parsed.data.approved_by_admin_id && parsed.data.approved_by_admin_id !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const telegramUserId = parsed.data.telegram_id.trim();

  const resident = await prisma.resident.findFirst({
    where: { id: parsed.data.resident_id, estateId: session.estateId },
    include: { users: true },
  });

  if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alreadyCount = resident.users.filter((u) => u.telegramUserId).length;
  if (alreadyCount >= 2) {
    return NextResponse.json({ error: "Max limit reached" }, { status: 409 });
  }

  const existingTelegram = await prisma.user.findFirst({ where: { telegramUserId } });
  if (existingTelegram) {
    return NextResponse.json({ error: "Duplicate Telegram ID" }, { status: 409 });
  }

  // Prefer filling empty slot on existing users.
  const target = resident.users.find((u) => !u.telegramUserId) ?? null;
  if (target) {
    await prisma.user.update({ where: { id: target.id }, data: { telegramUserId } });
  } else {
    const passwordHash = await hashPassword(generatePassword());
    await prisma.user.create({
      data: {
        estateId: session.estateId,
        role: "RESIDENT_DELEGATE",
        name: `${resident.name} (Approved)` ,
        email: null,
        phone: null,
        passwordHash,
        residentId: resident.id,
        telegramUserId,
      },
    });
  }

  return NextResponse.json({ status: "added" });
}
