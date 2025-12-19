import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/current-user";
import type { Prisma } from "@prisma/client";

const bodySchema = z.object({
  code: z.string().min(3),
});

function denyReason(reason: string) {
  return `Access Denied\nReason: ${reason}`;
}

export async function POST(req: Request) {
  const guard = await requireCurrentUser();
  if (!guard || guard.role !== "GUARD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!guard.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  if (guard.estate?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const codeValue = parsed.data.code.trim();

  const code = await prisma.code.findFirst({
    where: {
      estateId: guard.estateId,
      code: codeValue,
    },
    include: { resident: true },
  });

  if (!code) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  const now = new Date();
  if (code.status !== "ACTIVE") {
    return NextResponse.json({ error: `Code is ${code.status}` }, { status: 400 });
  }
  if (now > code.expiresAt) {
    // mark expired
    await prisma.code.update({ where: { id: code.id }, data: { status: "EXPIRED", expiresAt: now } });
    return NextResponse.json({ error: "Code expired" }, { status: 400 });
  }

  if (code.resident.status !== "APPROVED") {
    return NextResponse.json({ error: denyReason("Resident disabled") }, { status: 403 });
  }

  const decision: "ALLOW" = "ALLOW";

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const log = await tx.validationLog.create({
      data: {
        estateId: guard.estateId!,
        codeId: code.id,
        guardUserId: guard.id,
        decision,
        houseNumber: code.resident.houseNumber,
        residentName: code.resident.name,
        passType: code.type,
        codeValue: code.code,
      },
    });

    let updatedCode = code;

    if (code.type === "GUEST") {
      // Guest codes end immediately when validated (regardless of allow/deny)
      updatedCode = await tx.code.update({
        where: { id: code.id },
        data: {
          status: "USED",
          expiresAt: now,
          lastValidatedAt: now,
        },
        include: { resident: true },
      });
    } else {
      // Staff codes do not expire after validation; just track last validation.
      updatedCode = await tx.code.update({
        where: { id: code.id },
        data: { lastValidatedAt: now },
        include: { resident: true },
      });
    }

    await tx.activityLog.create({
      data: {
        estateId: guard.estateId!,
        type: "VALIDATION_RECORDED",
        message: `Validation ${decision} for House ${code.resident.houseNumber} (${code.type})`,
      },
    });

    return { log, code: updatedCode };
  });

  return NextResponse.json({ ok: true, log: result.log, code: result.code });
}
