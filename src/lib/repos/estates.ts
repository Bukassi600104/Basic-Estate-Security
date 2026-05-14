import { getSupabaseAdmin } from "@/lib/supabase/admin";
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
  initials: string;
  status: EstateStatus;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartedAt: string;
  trialEndsAt: string;
  subscriptionStartedAt?: string;
  maxHouses: number;
  maxAdmins: number;
  features: TierFeatures;
};

export type { SubscriptionTier, SubscriptionStatus, BillingCycle, TierFeatures };

function rowToEstate(row: Record<string, unknown>): EstateRecord {
  return {
    estateId: row.estate_id as string,
    name: row.name as string,
    initials: row.initials as string,
    status: row.status as EstateStatus,
    address: (row.address as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    subscriptionTier: row.subscription_tier as SubscriptionTier,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    billingCycle: row.billing_cycle as BillingCycle,
    trialStartedAt: row.trial_started_at as string,
    trialEndsAt: row.trial_ends_at as string,
    subscriptionStartedAt: (row.subscription_started_at as string) ?? undefined,
    maxHouses: row.max_houses as number,
    maxAdmins: row.max_admins as number,
    features: row.features as TierFeatures,
  };
}

export function deriveEstateInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "XX";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function createEstate(params: {
  name: string;
  address?: string;
  tier?: SubscriptionTier;
  billingCycle?: BillingCycle;
}) {
  const now = new Date();
  const tier = params.tier ?? "BASIC";
  const tierConfig = TIER_CONFIG[tier];
  const trialEndDate = calculateTrialEndDate(now);

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("estates")
    .insert({
      name: params.name,
      initials: deriveEstateInitials(params.name),
      status: "ACTIVE",
      address: params.address?.trim() || null,
      subscription_tier: tier,
      subscription_status: "TRIALING",
      billing_cycle: params.billingCycle ?? "MONTHLY",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndDate.toISOString(),
      max_houses: tierConfig.maxHouses,
      max_admins: tierConfig.maxAdmins,
      features: tierConfig.features,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToEstate(data);
}

export async function getEstateById(estateId: string): Promise<EstateRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("estates")
    .select()
    .eq("estate_id", estateId)
    .single();

  if (error || !data) return null;
  return rowToEstate(data);
}

export async function deleteEstateById(estateId: string) {
  const sb = getSupabaseAdmin();
  await sb.from("estates").delete().eq("estate_id", estateId);
}

export async function endEstateTrial(estateId: string): Promise<EstateRecord | null> {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("estates")
    .update({ trial_ends_at: now, subscription_status: "EXPIRED", updated_at: now })
    .eq("estate_id", estateId)
    .select()
    .single();
  if (error || !data) return null;
  return rowToEstate(data);
}

export async function updateEstate(params: {
  estateId: string;
  status?: EstateStatus;
  address?: string | null;
}) {
  const sb = getSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.status) updates.status = params.status;
  if (typeof params.address !== "undefined") updates.address = params.address;

  const { data, error } = await sb
    .from("estates")
    .update(updates)
    .eq("estate_id", params.estateId)
    .select()
    .single();

  if (error || !data) return null;
  return rowToEstate(data);
}

export async function updateEstateSubscription(params: {
  estateId: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionTier?: SubscriptionTier;
  billingCycle?: BillingCycle;
}) {
  const sb = getSupabaseAdmin();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (params.subscriptionStatus) updates.subscription_status = params.subscriptionStatus;
  if (params.billingCycle) updates.billing_cycle = params.billingCycle;

  if (params.subscriptionTier) {
    const tierConfig = TIER_CONFIG[params.subscriptionTier];
    updates.subscription_tier = params.subscriptionTier;
    updates.max_houses = tierConfig.maxHouses;
    updates.max_admins = tierConfig.maxAdmins;
    updates.features = tierConfig.features;
  }

  const { data, error } = await sb
    .from("estates")
    .update(updates)
    .eq("estate_id", params.estateId)
    .select()
    .single();

  if (error || !data) return null;
  return rowToEstate(data);
}

export async function listEstates(params?: { limit?: number }): Promise<EstateRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("estates")
    .select()
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 200);

  if (error || !data) return [];
  return data.map(rowToEstate);
}

export async function listEstatesPage(params: {
  limit?: number;
  cursor?: string;
}): Promise<{ items: EstateRecord[]; nextCursor?: string }> {
  const limit = params.limit ?? 50;
  const offset = params.cursor ? parseInt(params.cursor, 10) || 0 : 0;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("estates")
    .select()
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error || !data) return { items: [] };
  const items = data.map(rowToEstate);
  const nextCursor = items.length > limit ? String(offset + limit) : undefined;
  return { items: items.slice(0, limit), nextCursor };
}

export async function findEstateByName(name: string): Promise<EstateRecord | null> {
  const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("estates")
    .select()
    .ilike("name", normalized)
    .limit(1)
    .single();

  if (error || !data) {
    const estates = await listEstates({ limit: 500 });
    return (
      estates.find((e) => e.name.toLowerCase().replace(/\s+/g, " ").trim() === normalized) ?? null
    );
  }
  return rowToEstate(data);
}
