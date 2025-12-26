import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import {
  enforceSameOriginOr403,
  requireActiveEstateForCurrentUser,
  requireCurrentUserEstateId,
  requireCurrentUserWithRoles,
} from "@/lib/auth/guards";
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
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const guardRes = await requireCurrentUserWithRoles({ roles: ["GUARD"] });
  if (!guardRes.ok) return guardRes.response;
  const guard = guardRes.value;

  const estateIdRes = requireCurrentUserEstateId(guard);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const active = requireActiveEstateForCurrentUser(guard);
  if (!active.ok) return active.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `guard:validate:${ip}:${guard.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
    );
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
  if (!gate || gate.estateId !== estateId) {
    const log = {
      logId: newValidationLogId(),
      estateId,
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

  const code = await getCodeByValue({ estateId, codeValue });
  if (!code || code.estateId !== estateId) {
    const log = {
      logId: newValidationLogId(),
      estateId,
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
  if (!resident || resident.estateId !== estateId) {
    const log = {
      logId: newValidationLogId(),
      estateId,
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
      estateId,
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
      estateId,
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
      estateId,
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
    estateId,
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
    const codeKey = makeCodeKey({ estateId, codeValue: code.codeValue });
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
