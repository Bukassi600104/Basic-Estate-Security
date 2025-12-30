import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type UserRole =
  | "SUPER_ADMIN"
  | "ESTATE_ADMIN"
  | "GUARD"
  | "RESIDENT"
  | "RESIDENT_DELEGATE";

export type UserRecord = {
  userId: string; // Cognito sub
  estateId?: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  residentId?: string;
  verificationCode?: string; // Format: BS-{ESTATE_INITIALS}-{YEAR} (for guards)
  createdAt: string;
  updatedAt: string;
};

export type DdbCursor = Record<string, unknown>;

export async function putUser(user: UserRecord) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_USERS,
      Item: user,
      ConditionExpression: "attribute_not_exists(userId)",
    }),
  );
}

export async function upsertUser(user: UserRecord) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_USERS,
      Item: user,
    }),
  );
}

export async function getUserById(userId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const res = await ddb.send(
    new GetCommand({
      TableName: env.DDB_TABLE_USERS,
      Key: { userId },
    }),
  );

  return (res.Item as UserRecord | undefined) ?? null;
}

export async function listUsersForEstate(params: { estateId: string; limit?: number }) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 250;

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_USERS,
      IndexName: "GSI1",
      KeyConditionExpression: "estateId = :e",
      ExpressionAttributeValues: { ":e": params.estateId },
      ScanIndexForward: true,
      Limit: limit,
    }),
  );

  return ((res.Items as UserRecord[] | undefined) ?? []).slice(0, limit);
}

export async function listUsersForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: DdbCursor;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 250;

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_USERS,
      IndexName: "GSI1",
      KeyConditionExpression: "estateId = :e",
      ExpressionAttributeValues: { ":e": params.estateId },
      ScanIndexForward: true,
      Limit: limit,
      ExclusiveStartKey: (params.cursor as any) ?? undefined,
    }),
  );

  return {
    items: ((res.Items as UserRecord[] | undefined) ?? []).slice(0, limit),
    nextCursor: (res.LastEvaluatedKey as DdbCursor | undefined) ?? undefined,
  };
}

export async function listGuardsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: DdbCursor;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 50;

  const items: UserRecord[] = [];
  let cursor: DdbCursor | undefined = params.cursor;
  let loops = 0;

  // We may need to loop because FilterExpression can return fewer than Limit.
  while (items.length < limit && loops < 10) {
    loops += 1;

    const res: any = await ddb.send(
      new QueryCommand({
        TableName: env.DDB_TABLE_USERS,
        IndexName: "GSI1",
        KeyConditionExpression: "estateId = :e",
        FilterExpression: "#role = :r",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":e": params.estateId, ":r": "GUARD" },
        ScanIndexForward: true,
        Limit: limit,
        ExclusiveStartKey: (cursor as any) ?? undefined,
      }),
    );

    const pageItems = (res.Items as UserRecord[] | undefined) ?? [];
    for (const u of pageItems) {
      if (items.length >= limit) break;
      items.push(u);
    }

    cursor = (res.LastEvaluatedKey as DdbCursor | undefined) ?? undefined;
    if (!cursor) break;
  }

  return {
    items,
    nextCursor: cursor,
  };
}

export async function listUsersForResident(params: { estateId: string; residentId: string; limit?: number }) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 50;
  const items: UserRecord[] = [];
  let cursor: DdbCursor | undefined = undefined;
  let loops = 0;

  // We may need to loop because FilterExpression can return fewer than Limit.
  while (items.length < limit && loops < 10) {
    loops += 1;

    const queryRes = (await ddb.send(
      new QueryCommand({
        TableName: env.DDB_TABLE_USERS,
        IndexName: "GSI1",
        KeyConditionExpression: "estateId = :e",
        FilterExpression: "residentId = :r",
        ExpressionAttributeValues: { ":e": params.estateId, ":r": params.residentId },
        ScanIndexForward: true,
        Limit: limit,
        ExclusiveStartKey: (cursor as any) ?? undefined,
      }),
    )) as { Items?: unknown[]; LastEvaluatedKey?: DdbCursor };

    const pageItems = (queryRes.Items as UserRecord[] | undefined) ?? [];
    for (const u of pageItems) {
      if (items.length >= limit) break;
      items.push(u);
    }

    cursor = (queryRes.LastEvaluatedKey as DdbCursor | undefined) ?? undefined;
    if (!cursor) break;
  }

  return items;
}

export async function updateUserResidentId(params: { userId: string; residentId: string | null }) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const sets: string[] = ["updatedAt = :u"];
  const values: Record<string, unknown> = { ":u": now };

  if (params.residentId) {
    sets.push("residentId = :r");
    values[":r"] = params.residentId;
  } else {
    sets.push("residentId = :r");
    values[":r"] = null;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: env.DDB_TABLE_USERS,
      Key: { userId: params.userId },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(userId)",
    }),
  );
}

/**
 * Find guard by phone number within an estate.
 * Normalizes phone numbers for comparison.
 */
export async function findGuardByPhoneInEstate(params: {
  estateId: string;
  phone: string;
}): Promise<UserRecord | null> {
  const normalizedPhone = normalizePhone(params.phone);
  const { items: guards } = await listGuardsForEstatePage({ estateId: params.estateId, limit: 500 });
  return (
    guards.find((g) => g.phone && normalizePhone(g.phone) === normalizedPhone) ?? null
  );
}

/**
 * Normalize phone number for comparison.
 * Removes all non-digit chars except leading +.
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  // If doesn't start with +, assume Nigerian number
  if (!cleaned.startsWith("+")) {
    return `+234${cleaned.replace(/^0/, "")}`;
  }
  return cleaned;
}
