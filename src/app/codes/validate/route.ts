import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

const bodySchema = z.object({
  code_value: z.string().min(3),
  security_id: z.string().min(1).optional(),
  estate_id: z.string().min(1).optional(),
  gate_id: z.string().min(1).optional(),
  gate_name: z.string().min(1).optional(),
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

  const now = new Date();
  const codeValue = parsed.data.code_value.trim();

  const guardId = sessionUser?.role === "GUARD" ? sessionUser.id : parsed.data.security_id;
  const estateId = sessionUser?.role === "GUARD" ? sessionUser.estateId : parsed.data.estate_id;

  if (!guardId || !estateId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await prisma.user.findUnique({ where: { id: guardId }, include: { estate: true } });
  if (!guard || guard.role !== "GUARD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (guard.estateId !== estateId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (guard.estate?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }

  const code = await prisma.code.findFirst({
    where: { estateId, code: codeValue },
    include: { resident: true },
  });

  // Always log attempts.
  if (!code) {
    await prisma.validationLog.create({
      data: {
        estateId,
        codeId: null,
        guardUserId: guard.id,
        decision: "DENY",
        outcome: "FAILED",
        failureReason: "Code not found",
        codeValue,
        gateId: parsed.data.gate_id,
        gateName: parsed.data.gate_name,
      },
    });

    return NextResponse.json({ status: "invalid" }, { status: 404 });
  }

  if (code.status !== "ACTIVE") {
    await prisma.validationLog.create({
      data: {
        estateId,
        codeId: code.id,
        guardUserId: guard.id,
        decision: "DENY",
        outcome: "FAILED",
        failureReason: `Code is ${code.status}`,
        codeValue: code.code,
        houseNumber: code.resident.houseNumber,
        residentName: code.resident.name,
        passType: code.type,
        gateId: parsed.data.gate_id,
        gateName: parsed.data.gate_name,
      },
    });

    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  if (now > code.expiresAt) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.code.update({ where: { id: code.id }, data: { status: "EXPIRED", expiresAt: now } });
      await tx.validationLog.create({
        data: {
          estateId,
          codeId: code.id,
          guardUserId: guard.id,
          decision: "DENY",
          outcome: "FAILED",
          failureReason: "Code expired",
          codeValue: code.code,
          houseNumber: code.resident.houseNumber,
          residentName: code.resident.name,
          passType: code.type,
          gateId: parsed.data.gate_id,
          gateName: parsed.data.gate_name,
        },
      });
    });

    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  if (code.resident.status !== "APPROVED") {
    await prisma.validationLog.create({
      data: {
        estateId,
        codeId: code.id,
        guardUserId: guard.id,
        decision: "DENY",
        outcome: "FAILED",
        failureReason: "Resident disabled",
        codeValue: code.code,
        houseNumber: code.resident.houseNumber,
        residentName: code.resident.name,
        passType: code.type,
        gateId: parsed.data.gate_id,
        gateName: parsed.data.gate_name,
      },
    });

    return NextResponse.json({ status: "invalid" }, { status: 403 });
  }

  const decision: "ALLOW" = "ALLOW";

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const log = await tx.validationLog.create({
      data: {
        estateId,
        codeId: code.id,
        guardUserId: guard.id,
        decision,
        outcome: "SUCCESS",
        houseNumber: code.resident.houseNumber,
        residentName: code.resident.name,
        passType: code.type,
        codeValue: code.code,
        gateId: parsed.data.gate_id,
        gateName: parsed.data.gate_name,
      },
    });

    let updated = code;
    if (code.type === "GUEST") {
      updated = await tx.code.update({
        where: { id: code.id },
        data: { status: "USED", expiresAt: now, lastValidatedAt: now },
        include: { resident: true },
      });
    } else {
      updated = await tx.code.update({
        where: { id: code.id },
        data: { lastValidatedAt: now },
        include: { resident: true },
      });
    }

    await tx.activityLog.create({
      data: {
        estateId,
        type: "VALIDATION_RECORDED",
        message: `Validation ${decision} for House ${code.resident.houseNumber} (${code.type})`,
      },
    });

    return { log, code: updated };
  });

  return NextResponse.json({
    status: "valid",
    code_id: result.code.id,
    log_id: result.log.id,
    expiry_datetime: result.code.expiresAt,
  });
}
