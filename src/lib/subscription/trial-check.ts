/**
 * Trial status checking utilities
 */

import type { EstateRecord } from "@/lib/repos/estates";

export type TrialStatus = {
  isTrialing: boolean;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // < 7 days remaining
  trialEndsAt: Date | null;
};

/**
 * Get the trial status for an estate
 */
export function getTrialStatus(estate: EstateRecord): TrialStatus {
  // If not in trial status, return non-trial state
  if (estate.subscriptionStatus !== "TRIALING") {
    return {
      isTrialing: false,
      daysRemaining: 0,
      isExpired: estate.subscriptionStatus === "EXPIRED",
      isExpiringSoon: false,
      trialEndsAt: null,
    };
  }

  const now = new Date();
  const trialEnd = new Date(estate.trialEndsAt);
  const diffMs = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isTrialing: true,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired: daysRemaining <= 0,
    isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
    trialEndsAt: trialEnd,
  };
}

/**
 * Check if a subscription is active (trialing or paid active)
 */
export function isSubscriptionActive(estate: EstateRecord): boolean {
  const trialStatus = getTrialStatus(estate);

  // If trialing and not expired, it's active
  if (trialStatus.isTrialing && !trialStatus.isExpired) {
    return true;
  }

  // If paid and active
  if (estate.subscriptionStatus === "ACTIVE") {
    return true;
  }

  return false;
}

/**
 * Format trial status for display
 */
export function formatTrialStatus(estate: EstateRecord): string {
  const status = getTrialStatus(estate);

  if (!status.isTrialing) {
    switch (estate.subscriptionStatus) {
      case "ACTIVE":
        return "Active subscription";
      case "PAST_DUE":
        return "Payment past due";
      case "EXPIRED":
        return "Subscription expired";
      default:
        return estate.subscriptionStatus;
    }
  }

  if (status.isExpired) {
    return "Trial expired";
  }

  if (status.daysRemaining === 1) {
    return "Trial ends tomorrow";
  }

  return `${status.daysRemaining} days left in trial`;
}

/**
 * Get the urgency level for the trial status
 * Used for styling (e.g., banner colors)
 */
export function getTrialUrgency(estate: EstateRecord): "normal" | "warning" | "critical" {
  const status = getTrialStatus(estate);

  if (status.isExpired || estate.subscriptionStatus === "EXPIRED") {
    return "critical";
  }

  if (status.isExpiringSoon || estate.subscriptionStatus === "PAST_DUE") {
    return "warning";
  }

  return "normal";
}
