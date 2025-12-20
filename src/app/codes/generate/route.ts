import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

const bodySchema = z.object({
  resident_id: z.string().min(1),
  estate_id: z.string().min(1),
  type: z.enum(["guest", "house_help"]),
  expiry_hours: z.number().int().min(1).max(72).optional(),
});

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function generateCodeValue() {
  return `BS-${nanoid(8).toUpperCase()}`;
}

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

  const { resident_id: residentId, estate_id: estateId, type, expiry_hours } = parsed.data;

  const estate = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }

  const resident = await prisma.resident.findUnique({ where: { id: residentId } });
  if (!resident || resident.estateId !== estateId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (resident.status !== "APPROVED") {
    return NextResponse.json({ error: "Resident disabled" }, { status: 403 });
  }

  const createdBy = await prisma.user.findFirst({ where: { residentId, role: "RESIDENT" } });
  if (!createdBy) {
    return NextResponse.json({ error: "Resident account not found" }, { status: 404 });
  }

  const now = new Date();
  const codeType = type === "guest" ? "GUEST" : "STAFF";
  const expiresAt =
    codeType === "GUEST" ? addHours(now, expiry_hours ?? 6) : addDays(now, 183);

  let created: { id: string; code: string; expiresAt: Date } | null = null;
  for (let i = 0; i < 4; i++) {
    const codeValue = generateCodeValue();
    try {
      created = await prisma.code.create({
        data: {
          estateId,
          residentId,
          createdById: createdBy.id,
          type: codeType,
          code: codeValue,
          expiresAt,
        },
        select: { id: true, code: true, expiresAt: true },
      });
      break;
    } catch {
      // retry on uniqueness collision
    }
  }

  if (!created) {
    return NextResponse.json({ error: "Backend failure" }, { status: 500 });
  }

  await prisma.activityLog.create({
    data: {
      estateId,
      type: "CODE_CREATED",
      message: `${codeType} code created for House ${resident.houseNumber}`,
    },
  });

  return NextResponse.json({
    code_value: created.code,
    expiry_datetime: created.expiresAt,
    code_id: created.id,
  });
}
