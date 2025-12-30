import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type EstateStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED";

export type EstateRecord = {
  estateId: string;
  name: string;
  initials: string; // Auto-derived from name, e.g., "BG" for "Blue Gardens"
  status: EstateStatus;
  address?: string | null;
  // Optional index key for scalable listing (GSI1).
  gsi1pk?: "ESTATES";
  createdAt: string;
  updatedAt: string;
};

/**
 * Derive 2-letter initials from estate name.
 * E.g., "Blue Gardens" -> "BG", "Lekki Phase 1" -> "LP"
 */
export function deriveEstateInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "XX";
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function createEstate(params: { name: string; address?: string }) {
  const now = new Date().toISOString();
  const estate: EstateRecord = {
    estateId: `est_${nanoid(12)}`,
    name: params.name,
    initials: deriveEstateInitials(params.name),
    status: "ACTIVE",
    address: params.address?.trim() ? params.address.trim() : undefined,
    gsi1pk: "ESTATES",
    createdAt: now,
    updatedAt: now,
  };

  const env = getEnv();
  const ddb = getDdbDocClient();
  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_ESTATES,
      Item: estate,
      ConditionExpression: "attribute_not_exists(estateId)",
    }),
  );

  return estate;
}

export async function getEstateById(estateId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const res = await ddb.send(
    new GetCommand({
      TableName: env.DDB_TABLE_ESTATES,
      Key: { estateId },
    }),
  );

  return (res.Item as EstateRecord | undefined) ?? null;
}

export async function deleteEstateById(estateId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  await ddb.send(
    new DeleteCommand({
      TableName: env.DDB_TABLE_ESTATES,
      Key: { estateId },
    }),
  );
}

export async function updateEstate(params: {
  estateId: string;
  status?: EstateStatus;
  address?: string | null;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const sets: string[] = ["updatedAt = :u"];
  const values: Record<string, unknown> = {
    ":u": now,
  };

  if (params.status) {
    sets.push("#status = :s");
    values[":s"] = params.status;
  }
  if (typeof params.address !== "undefined") {
    sets.push("address = :a");
    values[":a"] = params.address;
  }

  const res = await ddb.send(
    new UpdateCommand({
      TableName: env.DDB_TABLE_ESTATES,
      Key: { estateId: params.estateId },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(estateId)",
      ReturnValues: "ALL_NEW",
    }),
  );

  return (res.Attributes as EstateRecord | undefined) ?? null;
}

export type DdbCursor = Record<string, unknown>;

export async function listEstatesPage(params?: { limit?: number; cursor?: DdbCursor }) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params?.limit ?? 200;

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_ESTATES,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: { ":pk": "ESTATES" },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: (params?.cursor as any) ?? undefined,
    }),
  );

  const items = (res.Items as EstateRecord[] | undefined) ?? [];
  return {
    items,
    nextCursor: (res.LastEvaluatedKey as DdbCursor | undefined) ?? undefined,
  };
}

export async function listEstates(params?: { limit?: number }) {
  const page = await listEstatesPage({ limit: params?.limit });
  return page.items;
}

/**
 * Find estate by name (case-insensitive match).
 * Returns null if not found.
 */
export async function findEstateByName(name: string): Promise<EstateRecord | null> {
  const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();
  const estates = await listEstates({ limit: 500 });
  return (
    estates.find((e) => e.name.toLowerCase().replace(/\s+/g, " ").trim() === normalized) ?? null
  );
}
