import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type PassType = "GUEST" | "STAFF";
export type CodeStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export type CodeRecord = {
  codeKey: string; // `ESTATE#{estateId}#CODE#{codeValue}`
  estateId: string;
  codeId: string;
  codeValue: string;
  residentId: string;
  // Optional index key for scalable per-resident listing (GSI1).
  residentKey?: string; // `ESTATE#{estateId}#RESIDENT#{residentId}`
  passType: PassType;
  status: CodeStatus;
  expiresAt: string; // ISO
  createdAt: string;
  updatedAt: string;
  usedAt?: string;
};

export function makeCodeKey(params: { estateId: string; codeValue: string }) {
  return `ESTATE#${params.estateId}#CODE#${params.codeValue}`;
}

export function makeResidentKey(params: { estateId: string; residentId: string }) {
  return `ESTATE#${params.estateId}#RESIDENT#${params.residentId}`;
}

export async function getCodeByValue(params: { estateId: string; codeValue: string }) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const codeKey = makeCodeKey(params);
  const res = await ddb.send(
    new GetCommand({
      TableName: env.DDB_TABLE_CODES,
      Key: { codeKey },
    }),
  );

  return (res.Item as CodeRecord | undefined) ?? null;
}

export async function listCodesForResident(params: {
  estateId: string;
  residentId: string;
  limit?: number;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 100;

  const residentKey = makeResidentKey({ estateId: params.estateId, residentId: params.residentId });
  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_CODES,
      IndexName: "GSI1",
      KeyConditionExpression: "residentKey = :rk",
      ExpressionAttributeValues: { ":rk": residentKey },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );

  const items = (res.Items as CodeRecord[] | undefined) ?? [];
  return items.slice(0, limit);
}

export async function findCodeById(params: {
  estateId: string;
  residentId: string;
  codeId: string;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_CODES,
      IndexName: "GSI2",
      KeyConditionExpression: "codeId = :c",
      ExpressionAttributeValues: { ":c": params.codeId },
      Limit: 1,
    }),
  );

  const item = res.Items?.[0] as CodeRecord | undefined;
  if (!item) return null;
  if (item.estateId !== params.estateId || item.residentId !== params.residentId) return null;
  return item;
}

function randomNumericCode(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export async function createCode(params: {
  estateId: string;
  residentId: string;
  passType: PassType;
  expiresAtIso: string;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  // Attempt a few times to avoid collisions.
  for (let attempt = 0; attempt < 8; attempt++) {
    const codeValue = randomNumericCode(6);
    const codeKey = makeCodeKey({ estateId: params.estateId, codeValue });

    const record: CodeRecord = {
      codeKey,
      estateId: params.estateId,
      codeId: `code_${nanoid(12)}`,
      codeValue,
      residentId: params.residentId,
      residentKey: makeResidentKey({ estateId: params.estateId, residentId: params.residentId }),
      passType: params.passType,
      status: "ACTIVE",
      expiresAt: params.expiresAtIso,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await ddb.send(
        new PutCommand({
          TableName: env.DDB_TABLE_CODES,
          Item: record,
          ConditionExpression: "attribute_not_exists(codeKey)",
        }),
      );
      return record;
    } catch {
      // Collision, retry.
    }
  }

  throw new Error("Failed to generate a unique code");
}

export async function renewStaffCode(params: {
  codeKey: string;
  newExpiresAtIso: string;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const res = await ddb.send(
    new UpdateCommand({
      TableName: env.DDB_TABLE_CODES,
      Key: { codeKey: params.codeKey },
      UpdateExpression: "SET expiresAt = :e, #status = :active, updatedAt = :u",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":e": params.newExpiresAtIso,
        ":active": "ACTIVE",
        ":u": now,
      },
      ConditionExpression: "attribute_exists(codeKey)",
      ReturnValues: "ALL_NEW",
    }),
  );

  return (res.Attributes as CodeRecord | undefined) ?? null;
}

export async function expireActiveCodesForResident(params: {
  estateId: string;
  residentId: string;
  nowIso?: string;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = params.nowIso ?? new Date().toISOString();

  const residentKey = makeResidentKey({ estateId: params.estateId, residentId: params.residentId });

  let cursor: Record<string, unknown> | undefined = undefined;
  let loops = 0;
  while (loops < 20) {
    loops += 1;

    const queryRes = (await ddb.send(
      new QueryCommand({
        TableName: env.DDB_TABLE_CODES,
        IndexName: "GSI1",
        KeyConditionExpression: "residentKey = :rk",
        FilterExpression: "#status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":rk": residentKey, ":active": "ACTIVE" },
        ScanIndexForward: false,
        Limit: 500,
        ExclusiveStartKey: (cursor as any) ?? undefined,
      }),
    )) as { Items?: unknown[]; LastEvaluatedKey?: Record<string, unknown> };

    const items = (queryRes.Items as CodeRecord[] | undefined) ?? [];
    for (const code of items) {
      await ddb.send(
        new UpdateCommand({
          TableName: env.DDB_TABLE_CODES,
          Key: { codeKey: code.codeKey },
          UpdateExpression: "SET #status = :expired, expiresAt = :now, updatedAt = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":expired": "EXPIRED", ":now": now },
        }),
      );
    }

    cursor = (queryRes.LastEvaluatedKey as Record<string, unknown> | undefined) ?? undefined;
    if (!cursor) break;
  }
}
