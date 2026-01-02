/**
 * Feature gating utilities based on subscription tier
 */

import type { EstateRecord } from "@/lib/repos/estates";
import { isSubscriptionActive } from "./trial-check";

/**
 * Check if the estate can use the export feature
 */
export function canExport(estate: EstateRecord): boolean {
  if (!isSubscriptionActive(estate)) {
    return false;
  }
  return estate.features.exportEnabled;
}

/**
 * Check if the estate can view advanced analytics
 */
export function canViewAdvancedAnalytics(estate: EstateRecord): boolean {
  if (!isSubscriptionActive(estate)) {
    return false;
  }
  return estate.features.advancedAnalytics;
}

/**
 * Check if the estate can add a sub-admin
 * @param currentAdminCount - The current number of admins (including main admin)
 */
export function canAddSubAdmin(estate: EstateRecord, currentAdminCount: number): boolean {
  if (!isSubscriptionActive(estate)) {
    return false;
  }
  if (!estate.features.subAdminEnabled) {
    return false;
  }
  return currentAdminCount < estate.maxAdmins;
}

/**
 * Check if the estate can add more houses/residents
 * @param currentHouseCount - The current number of houses with residents
 */
export function canAddHouse(estate: EstateRecord, currentHouseCount: number): boolean {
  if (!isSubscriptionActive(estate)) {
    return false;
  }
  return currentHouseCount < estate.maxHouses;
}

/**
 * Get the number of remaining sub-admins that can be added
 * @param currentAdminCount - The current number of admins (including main admin)
 */
export function getRemainingSubAdminSlots(estate: EstateRecord, currentAdminCount: number): number {
  if (!estate.features.subAdminEnabled) {
    return 0;
  }
  return Math.max(0, estate.maxAdmins - currentAdminCount);
}

/**
 * Get the number of remaining houses that can be added
 * @param currentHouseCount - The current number of houses with residents
 */
export function getRemainingHouseSlots(estate: EstateRecord, currentHouseCount: number): number {
  if (estate.maxHouses === Infinity) {
    return Infinity;
  }
  return Math.max(0, estate.maxHouses - currentHouseCount);
}

/**
 * Check if a feature is available in the estate's tier
 * Returns the feature availability and reason if not available
 */
export function checkFeatureAccess(
  estate: EstateRecord,
  feature: "export" | "analytics" | "subAdmin"
): { allowed: boolean; reason?: string } {
  if (!isSubscriptionActive(estate)) {
    return {
      allowed: false,
      reason: "Your subscription has expired. Please upgrade to continue using this feature.",
    };
  }

  switch (feature) {
    case "export":
      if (!estate.features.exportEnabled) {
        return {
          allowed: false,
          reason: "Export to Excel is available on Standard and Premium plans. Upgrade to access this feature.",
        };
      }
      break;
    case "analytics":
      if (!estate.features.advancedAnalytics) {
        return {
          allowed: false,
          reason: "Advanced analytics is available on Standard and Premium plans. Upgrade to access this feature.",
        };
      }
      break;
    case "subAdmin":
      if (!estate.features.subAdminEnabled) {
        return {
          allowed: false,
          reason: "Sub-admin accounts are available on Standard and Premium plans. Upgrade to access this feature.",
        };
      }
      break;
  }

  return { allowed: true };
}

/**
 * Get usage statistics for the estate
 */
export function getUsageStats(
  estate: EstateRecord,
  counts: { houses: number; admins: number }
): {
  houses: { used: number; limit: number; percentage: number };
  admins: { used: number; limit: number; percentage: number };
} {
  const housesPercentage =
    estate.maxHouses === Infinity
      ? 0
      : Math.round((counts.houses / estate.maxHouses) * 100);

  const adminsPercentage =
    estate.maxAdmins === Infinity
      ? 0
      : Math.round((counts.admins / estate.maxAdmins) * 100);

  return {
    houses: {
      used: counts.houses,
      limit: estate.maxHouses,
      percentage: housesPercentage,
    },
    admins: {
      used: counts.admins,
      limit: estate.maxAdmins,
      percentage: adminsPercentage,
    },
  };
}
