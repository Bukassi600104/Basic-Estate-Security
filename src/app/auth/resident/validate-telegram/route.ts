import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  telegram_id: z.string().min(1),
});

function requireTelegramSecret(req: Request) {
  const env = getEnv();
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  if (!requireTelegramSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const telegramUserId = parsed.data.telegram_id.trim();

  const user = await prisma.user.findFirst({
    where: {
      telegramUserId,
      role: { in: ["RESIDENT", "RESIDENT_DELEGATE"] },
    },
    include: { resident: true, estate: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = user.estate?.status === "ACTIVE" && user.resident?.status === "APPROVED";

  return NextResponse.json({
    status: active ? "active" : "disabled",
    resident_id: user.residentId,
    estate_id: user.estateId,
  });
}
