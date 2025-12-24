import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type GateRecord = {
  gateId: string;
  estateId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export async function getGateById(gateId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const res = await ddb.send(
    new GetCommand({
      TableName: env.DDB_TABLE_GATES,
      Key: { gateId },
    }),
  );

  return (res.Item as GateRecord | undefined) ?? null;
}

export async function listGatesForEstate(estateId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_GATES,
      IndexName: "GSI1",
      KeyConditionExpression: "estateId = :e",
      ExpressionAttributeValues: { ":e": estateId },
      ScanIndexForward: true,
      Limit: 100,
    }),
  );

  return (res.Items as GateRecord[] | undefined) ?? [];
}

export async function createGate(params: { estateId: string; name: string }) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  // Best-effort duplicate check (Query-based). For strict enforcement, use a uniqueness table/GSI.
  const existing = await listGatesForEstate(params.estateId);
  const normalized = params.name.trim().toLowerCase();
  if (existing.some((g) => g.name.trim().toLowerCase() === normalized)) {
    return { ok: false as const, error: "Gate already exists" };
  }

  const gate: GateRecord = {
    gateId: `gate_${nanoid(12)}`,
    estateId: params.estateId,
    name: params.name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_GATES,
      Item: gate,
      ConditionExpression: "attribute_not_exists(gateId)",
    }),
  );

  return { ok: true as const, gate };
}

export async function updateGateName(params: { gateId: string; name: string }) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const res = await ddb.send(
    new UpdateCommand({
      TableName: env.DDB_TABLE_GATES,
      Key: { gateId: params.gateId },
      UpdateExpression: "SET #name = :n, updatedAt = :u",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: { ":n": params.name.trim(), ":u": now },
      ConditionExpression: "attribute_exists(gateId)",
      ReturnValues: "ALL_NEW",
    }),
  );

  return (res.Attributes as GateRecord | undefined) ?? null;
}

export async function deleteGate(gateId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  await ddb.send(
    new DeleteCommand({
      TableName: env.DDB_TABLE_GATES,
      Key: { gateId },
    }),
  );
}
