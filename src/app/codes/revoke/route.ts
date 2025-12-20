import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

const bodySchema = z.object({
  code_id: z.string().min(1),
});

function requireBotSecretIfNoSession(req: Request, hasSession: boolean) {
  if (hasSession) return true;
  const env = getEnv();
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (env.TELEGRAM_WEBHOOK_SECRET && secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const sessionUser = await requireCurrentUser().catch(() => null);
  const hasSession = Boolean(sessionUser);

  if (!requireBotSecretIfNoSession(req, hasSession)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const code = await prisma.code.findUnique({
    where: { id: parsed.data.code_id },
    include: { estate: true, resident: true },
  });

  if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (code.estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }

  const now = new Date();
  await prisma.code.update({
    where: { id: code.id },
    data: { status: "REVOKED", expiresAt: now },
  });

  await prisma.activityLog.create({
    data: {
      estateId: code.estateId,
      type: "CODE_REVOKED",
      message: `Code revoked for House ${code.resident.houseNumber} (${code.type})`,
    },
  });

  return NextResponse.json({ status: "revoked" });
}
