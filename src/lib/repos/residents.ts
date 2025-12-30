import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type ResidentStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export type ResidentRecord = {
  residentId: string;
  estateId: string;
  name: string;
  houseNumber: string;
  status: ResidentStatus;
  phone?: string;
  email?: string;
  verificationCode?: string; // Format: BS-{ESTATE_INITIALS}-{YEAR}
  createdAt: string;
  updatedAt: string;
};

export type DdbCursor = Record<string, unknown>;

export async function createResident(params: {
  estateId: string;
  name: string;
  houseNumber: string;
  phone?: string;
  email?: string;
  status?: ResidentStatus;
  verificationCode?: string;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const resident: ResidentRecord = {
    residentId: `res_${nanoid(12)}`,
    estateId: params.estateId,
    name: params.name,
    houseNumber: params.houseNumber,
    status: params.status ?? "APPROVED",
    phone: params.phone,
    email: params.email,
    verificationCode: params.verificationCode,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_RESIDENTS,
      Item: resident,
      ConditionExpression: "attribute_not_exists(residentId)",
    }),
  );

  return resident;
}

export async function listResidentsForEstate(estateId: string, limit = 250) {
  const page = await listResidentsForEstatePage({ estateId, limit });
  return page.items;
}

export async function listResidentsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: DdbCursor;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 250;

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_RESIDENTS,
      IndexName: "GSI1",
      KeyConditionExpression: "estateId = :e",
      ExpressionAttributeValues: { ":e": params.estateId },
      Limit: limit,
      ExclusiveStartKey: (params.cursor as any) ?? undefined,
    }),
  );

  const items = (res.Items as ResidentRecord[] | undefined) ?? [];
  return {
    items: items.slice(0, limit),
    nextCursor: (res.LastEvaluatedKey as DdbCursor | undefined) ?? undefined,
  };
}

export async function updateResidentStatus(params: { residentId: string; status: ResidentStatus }) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const res = await ddb.send(
    new UpdateCommand({
      TableName: env.DDB_TABLE_RESIDENTS,
      Key: { residentId: params.residentId },
      UpdateExpression: "SET #status = :s, updatedAt = :u",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":s": params.status, ":u": now },
      ConditionExpression: "attribute_exists(residentId)",
      ReturnValues: "ALL_NEW",
    }),
  );

  return (res.Attributes as ResidentRecord | undefined) ?? null;
}

export async function deleteResident(residentId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  await ddb.send(
    new DeleteCommand({
      TableName: env.DDB_TABLE_RESIDENTS,
      Key: { residentId },
    }),
  );
}

export async function getResidentById(residentId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const res = await ddb.send(
    new GetCommand({
      TableName: env.DDB_TABLE_RESIDENTS,
      Key: { residentId },
    }),
  );

  return (res.Item as ResidentRecord | undefined) ?? null;
}

/**
 * Find resident by phone number within an estate.
 * Normalizes phone numbers for comparison.
 */
export async function findResidentByPhoneInEstate(params: {
  estateId: string;
  phone: string;
}): Promise<ResidentRecord | null> {
  const normalizedPhone = normalizePhone(params.phone);
  const residents = await listResidentsForEstate(params.estateId, 500);
  return (
    residents.find((r) => r.phone && normalizePhone(r.phone) === normalizedPhone) ?? null
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
