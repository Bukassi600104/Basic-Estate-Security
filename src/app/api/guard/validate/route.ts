import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";
import { getCodeByValue, makeCodeKey } from "@/lib/repos/codes";
import { getGateById } from "@/lib/repos/gates";
import { getResidentById } from "@/lib/repos/residents";
import { newValidationLogId } from "@/lib/repos/validation-logs";
import { TransactWriteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const bodySchema = z.object({
  code: z.string().min(3),
  gateId: z.string().min(1),
});

function denyReason(reason: string) {
  return `Access Denied\nReason: ${reason}`;
}

function nowIso() {
  return new Date().toISOString();
}

function codeExpired(params: { status: string; expiresAt: string; now: string }) {
  if (params.status !== "ACTIVE") return true;
  return params.expiresAt <= params.now;
}

function mapFailureToUserMessage(failureReason: string) {
  switch (failureReason) {
    case "INVALID_CODE":
      return denyReason("Invalid code");
    case "CODE_EXPIRED":
      return denyReason("Code expired");
    case "CODE_NOT_ACTIVE":
      return denyReason("Code not active");
    case "RESIDENT_SUSPENDED":
      return denyReason("Resident suspended");
    case "GATE_NOT_FOUND":
      return denyReason("Invalid gate");
    default:
      return denyReason("Invalid or expired code");
  }
}

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

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

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({
    key: `guard:validate:${ip}:${guard.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const env = getEnv();
  const ddb = getDdbDocClient();
  const timestamp = nowIso();

  const codeValue = parsed.data.code.trim();
  const gateId = parsed.data.gateId;

  const gate = await getGateById(gateId);
  if (!gate || gate.estateId !== guard.estateId) {
    const log = {
      logId: newValidationLogId(),
      estateId: guard.estateId,
      validatedAt: timestamp,
      gateId,
      gateName: gate?.name ?? "Unknown",
      outcome: "FAILURE" as const,
      decision: "DENY" as const,
      failureReason: "GATE_NOT_FOUND",
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    };
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: log }));
    return NextResponse.json({ error: mapFailureToUserMessage("GATE_NOT_FOUND") }, { status: 400 });
  }

  const code = await getCodeByValue({ estateId: guard.estateId, codeValue });
  if (!code || code.estateId !== guard.estateId) {
    const log = {
      logId: newValidationLogId(),
      estateId: guard.estateId,
      validatedAt: timestamp,
      gateId: gate.gateId,
      gateName: gate.name,
      outcome: "FAILURE" as const,
      decision: "DENY" as const,
      failureReason: "INVALID_CODE",
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    };
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: log }));
    return NextResponse.json({ error: mapFailureToUserMessage("INVALID_CODE") }, { status: 403 });
  }

  const resident = await getResidentById(code.residentId);
  if (!resident || resident.estateId !== guard.estateId) {
    const log = {
      logId: newValidationLogId(),
      estateId: guard.estateId,
      validatedAt: timestamp,
      gateId: gate.gateId,
      gateName: gate.name,
      outcome: "FAILURE" as const,
      decision: "DENY" as const,
      failureReason: "INVALID_CODE",
      passType: code.passType,
      residentName: resident?.name,
      houseNumber: resident?.houseNumber,
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    };
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: log }));
    return NextResponse.json({ error: mapFailureToUserMessage("INVALID_CODE") }, { status: 403 });
  }

  if (resident.status === "SUSPENDED") {
    const log = {
      logId: newValidationLogId(),
      estateId: guard.estateId,
      validatedAt: timestamp,
      gateId: gate.gateId,
      gateName: gate.name,
      outcome: "FAILURE" as const,
      decision: "DENY" as const,
      failureReason: "RESIDENT_SUSPENDED",
      passType: code.passType,
      residentName: resident.name,
      houseNumber: resident.houseNumber,
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    };
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: log }));
    return NextResponse.json({ error: mapFailureToUserMessage("RESIDENT_SUSPENDED") }, { status: 403 });
  }

  if (code.status !== "ACTIVE") {
    const log = {
      logId: newValidationLogId(),
      estateId: guard.estateId,
      validatedAt: timestamp,
      gateId: gate.gateId,
      gateName: gate.name,
      outcome: "FAILURE" as const,
      decision: "DENY" as const,
      failureReason: "CODE_NOT_ACTIVE",
      passType: code.passType,
      residentName: resident.name,
      houseNumber: resident.houseNumber,
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    };
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: log }));
    return NextResponse.json({ error: mapFailureToUserMessage("CODE_NOT_ACTIVE") }, { status: 403 });
  }

  if (codeExpired({ status: code.status, expiresAt: code.expiresAt, now: timestamp })) {
    const log = {
      logId: newValidationLogId(),
      estateId: guard.estateId,
      validatedAt: timestamp,
      gateId: gate.gateId,
      gateName: gate.name,
      outcome: "FAILURE" as const,
      decision: "DENY" as const,
      failureReason: "CODE_EXPIRED",
      passType: code.passType,
      residentName: resident.name,
      houseNumber: resident.houseNumber,
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    };
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: log }));
    return NextResponse.json({ error: mapFailureToUserMessage("CODE_EXPIRED") }, { status: 403 });
  }

  const successLog = {
    logId: newValidationLogId(),
    estateId: guard.estateId,
    validatedAt: timestamp,
    gateId: gate.gateId,
    gateName: gate.name,
    outcome: "SUCCESS" as const,
    decision: "ALLOW" as const,
    passType: code.passType,
    residentName: resident.name,
    houseNumber: resident.houseNumber,
    codeValue,
    guardUserId: guard.id,
    guardName: guard.name,
    guardPhone: guard.phone ?? undefined,
  };

  if (code.passType === "GUEST") {
    // Guest codes are single-use: mark USED + expire immediately on successful validation.
    // Do this atomically alongside writing the log.
    const codeKey = makeCodeKey({ estateId: guard.estateId, codeValue: code.codeValue });
    const now = timestamp;

    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: env.DDB_TABLE_CODES,
                Key: { codeKey },
                UpdateExpression: "SET #status = :used, expiresAt = :now, usedAt = :now, updatedAt = :now",
                ConditionExpression: "attribute_exists(codeKey) AND #status = :active AND expiresAt > :now",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                  ":active": "ACTIVE",
                  ":used": "USED",
                  ":now": now,
                },
              },
            },
            {
              Put: {
                TableName: env.DDB_TABLE_VALIDATION_LOGS,
                Item: successLog,
                ConditionExpression: "attribute_not_exists(logId)",
              },
            },
          ],
        }),
      );
    } catch {
      // If the conditional update failed, treat as invalid/expired and log a deny attempt.
      const failureLog = {
        ...successLog,
        outcome: "FAILURE" as const,
        decision: "DENY" as const,
        failureReason: "CODE_NOT_ACTIVE",
      };
      await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_VALIDATION_LOGS, Item: failureLog }));
      return NextResponse.json({ error: mapFailureToUserMessage("CODE_NOT_ACTIVE") }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  }

  // Staff codes: do not expire on validation.
  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_VALIDATION_LOGS,
      Item: successLog,
      ConditionExpression: "attribute_not_exists(logId)",
    }),
  );

  return NextResponse.json({ ok: true });
}
