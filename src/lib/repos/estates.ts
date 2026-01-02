import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";
import {
  type SubscriptionTier,
  type SubscriptionStatus,
  type BillingCycle,
  type TierFeatures,
  TIER_CONFIG,
  calculateTrialEndDate,
} from "@/lib/subscription/tiers";

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

  // Subscription fields
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartedAt: string;
  trialEndsAt: string;
  subscriptionStartedAt?: string; // When paid subscription starts (after trial)
  maxHouses: number;
  maxAdmins: number;
  features: TierFeatures;
};

// Re-export subscription types for convenience
export type { SubscriptionTier, SubscriptionStatus, BillingCycle, TierFeatures };

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

export async function createEstate(params: {
  name: string;
  address?: string;
  tier?: SubscriptionTier;
  billingCycle?: BillingCycle;
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const tier = params.tier ?? "BASIC";
  const tierConfig = TIER_CONFIG[tier];
  const trialEndDate = calculateTrialEndDate(now);

  const estate: EstateRecord = {
    estateId: `est_${nanoid(12)}`,
    name: params.name,
    initials: deriveEstateInitials(params.name),
    status: "ACTIVE",
    address: params.address?.trim() ? params.address.trim() : undefined,
    gsi1pk: "ESTATES",
    createdAt: nowIso,
    updatedAt: nowIso,

    // Subscription fields
    subscriptionTier: tier,
    subscriptionStatus: "TRIALING",
    billingCycle: params.billingCycle ?? "MONTHLY",
    trialStartedAt: nowIso,
    trialEndsAt: trialEndDate.toISOString(),
    maxHouses: tierConfig.maxHouses,
    maxAdmins: tierConfig.maxAdmins,
    features: tierConfig.features,
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

/**
 * Update subscription status for an estate
 */
export async function updateEstateSubscription(params: {
  estateId: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionTier?: SubscriptionTier;
  billingCycle?: BillingCycle;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const now = new Date().toISOString();

  const sets: string[] = ["updatedAt = :u"];
  const values: Record<string, unknown> = { ":u": now };
  const names: Record<string, string> = {};

  if (params.subscriptionStatus) {
    sets.push("subscriptionStatus = :ss");
    values[":ss"] = params.subscriptionStatus;
  }

  if (params.subscriptionTier) {
    const tierConfig = TIER_CONFIG[params.subscriptionTier];
    sets.push("subscriptionTier = :st");
    sets.push("maxHouses = :mh");
    sets.push("maxAdmins = :ma");
    sets.push("features = :f");
    values[":st"] = params.subscriptionTier;
    values[":mh"] = tierConfig.maxHouses;
    values[":ma"] = tierConfig.maxAdmins;
    values[":f"] = tierConfig.features;
  }

  if (params.billingCycle) {
    sets.push("billingCycle = :bc");
    values[":bc"] = params.billingCycle;
  }

  const res = await ddb.send(
    new UpdateCommand({
      TableName: env.DDB_TABLE_ESTATES,
      Key: { estateId: params.estateId },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 ? { ExpressionAttributeNames: names } : {}),
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
