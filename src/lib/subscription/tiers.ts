/**
 * Subscription tier configuration
 * Defines pricing, limits, and features for each tier
 */

export type SubscriptionTier = "BASIC" | "STANDARD" | "PREMIUM" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "EXPIRED";

export type TierFeatures = {
  exportEnabled: boolean;
  advancedAnalytics: boolean;
  subAdminEnabled: boolean;
};

export type TierConfig = {
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  } | null; // null for Enterprise (contact sales)
  maxHouses: number;
  maxAdmins: number;
  features: TierFeatures;
  popular?: boolean;
};

export const TRIAL_DURATION_DAYS = 30;
export const YEARLY_DISCOUNT = 0.05; // 5% discount

/**
 * Calculate yearly price with 5% discount
 */
function yearlyPrice(monthly: number): number {
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  BASIC: {
    name: "Basic",
    description: "Perfect for small estates with up to 20 houses",
    price: {
      monthly: 35000,
      yearly: yearlyPrice(35000), // ₦399,000
    },
    maxHouses: 20,
    maxAdmins: 1,
    features: {
      exportEnabled: false,
      advancedAnalytics: false,
      subAdminEnabled: false,
    },
  },
  STANDARD: {
    name: "Standard",
    description: "Ideal for medium estates with 21-50 houses",
    price: {
      monthly: 85000,
      yearly: yearlyPrice(85000), // ₦969,000
    },
    maxHouses: 50,
    maxAdmins: 2, // 1 main + 1 sub-admin
    features: {
      exportEnabled: true,
      advancedAnalytics: true,
      subAdminEnabled: true,
    },
    popular: true,
  },
  PREMIUM: {
    name: "Premium",
    description: "Best for large estates with 51-100 houses",
    price: {
      monthly: 125000,
      yearly: yearlyPrice(125000), // ₦1,425,000
    },
    maxHouses: 100,
    maxAdmins: 3, // 1 main + 2 sub-admins
    features: {
      exportEnabled: true,
      advancedAnalytics: true,
      subAdminEnabled: true,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "Custom solutions for estates with 100+ houses",
    price: null, // Contact sales
    maxHouses: Infinity,
    maxAdmins: Infinity,
    features: {
      exportEnabled: true,
      advancedAnalytics: true,
      subAdminEnabled: true,
    },
  },
};

/**
 * Feature list for display on pricing page
 */
export const FEATURE_LIST = [
  { key: "houses", label: "Houses/Units" },
  { key: "admins", label: "Admin Accounts" },
  { key: "guards", label: "Unlimited Guards" },
  { key: "gates", label: "Unlimited Gates" },
  { key: "codes", label: "Unlimited Access Codes" },
  { key: "validation", label: "Real-time Code Validation" },
  { key: "logs", label: "Validation Logs" },
  { key: "export", label: "Export to Excel" },
  { key: "analytics", label: "Advanced Analytics" },
  { key: "subadmin", label: "Sub-Admin Accounts" },
  { key: "support", label: "Email Support" },
  { key: "priority", label: "Priority Support" },
] as const;

/**
 * Get features included in each tier for display
 */
export function getTierFeatureList(tier: SubscriptionTier): {
  feature: string;
  included: boolean;
  value?: string;
}[] {
  const config = TIER_CONFIG[tier];

  return [
    { feature: "Houses/Units", included: true, value: config.maxHouses === Infinity ? "Unlimited" : `Up to ${config.maxHouses}` },
    { feature: "Admin Accounts", included: true, value: config.maxAdmins === Infinity ? "Unlimited" : `${config.maxAdmins}` },
    { feature: "Unlimited Guards", included: true },
    { feature: "Unlimited Gates", included: true },
    { feature: "Unlimited Access Codes", included: true },
    { feature: "Real-time Code Validation", included: true },
    { feature: "Validation Logs", included: true },
    { feature: "Export to Excel", included: config.features.exportEnabled },
    { feature: "Advanced Analytics", included: config.features.advancedAnalytics },
    { feature: "Sub-Admin Accounts", included: config.features.subAdminEnabled, value: config.features.subAdminEnabled ? `${config.maxAdmins - 1}` : undefined },
    { feature: "Email Support", included: true },
    { feature: "Priority Support", included: tier === "PREMIUM" || tier === "ENTERPRISE" },
  ];
}

/**
 * Format price in Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the tier for a given number of houses
 */
export function getTierForHouseCount(houseCount: number): SubscriptionTier {
  if (houseCount <= 20) return "BASIC";
  if (houseCount <= 50) return "STANDARD";
  if (houseCount <= 100) return "PREMIUM";
  return "ENTERPRISE";
}

/**
 * Calculate trial end date from start date
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);
  return endDate;
}
