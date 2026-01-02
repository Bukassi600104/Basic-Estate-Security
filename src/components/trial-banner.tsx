"use client";

import { useState } from "react";
import { Clock, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import type { EstateRecord } from "@/lib/repos/estates";
import {
  getTrialStatus,
  formatTrialStatus,
  getTrialUrgency,
} from "@/lib/subscription/trial-check";
import { UpgradeModal } from "@/components/upgrade-modal";

interface TrialBannerProps {
  estate: EstateRecord;
}

export function TrialBanner({ estate }: TrialBannerProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const trialStatus = getTrialStatus(estate);
  const urgency = getTrialUrgency(estate);
  const statusText = formatTrialStatus(estate);

  // Don't show banner for active paid subscriptions
  if (estate.subscriptionStatus === "ACTIVE") {
    return null;
  }

  // Determine styling based on urgency
  const styles = {
    normal: {
      container: "bg-brand-navy/10 border-brand-navy/20 text-brand-navy",
      icon: <Clock className="h-4 w-4" />,
      button: "bg-brand-navy text-white hover:bg-brand-navy-700",
    },
    warning: {
      container: "bg-amber-50 border-amber-200 text-amber-800",
      icon: <AlertTriangle className="h-4 w-4" />,
      button: "bg-amber-600 text-white hover:bg-amber-700",
    },
    critical: {
      container: "bg-rose-50 border-rose-200 text-rose-800",
      icon: <XCircle className="h-4 w-4" />,
      button: "bg-rose-600 text-white hover:bg-rose-700",
    },
  }[urgency];

  return (
    <>
      <div className={`border-b px-4 py-3 ${styles.container}`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {styles.icon}
            <span>{statusText}</span>
            {trialStatus.isTrialing && !trialStatus.isExpired && (
              <span className="hidden text-xs opacity-75 sm:inline">
                • Trial ends{" "}
                {trialStatus.trialEndsAt?.toLocaleDateString("en-NG", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowUpgradeModal(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${styles.button}`}
          >
            {trialStatus.isExpired ? "Choose a Plan" : "Upgrade Now"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={estate.subscriptionTier}
        currentBilling={estate.billingCycle}
      />
    </>
  );
}

/**
 * Compact version of trial banner for use in sidebars
 */
export function TrialBannerCompact({ estate }: TrialBannerProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const trialStatus = getTrialStatus(estate);
  const urgency = getTrialUrgency(estate);

  // Don't show for active paid subscriptions
  if (estate.subscriptionStatus === "ACTIVE") {
    return null;
  }

  const styles = {
    normal: "bg-brand-navy/10 border-brand-navy/20 text-brand-navy",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    critical: "bg-rose-50 border-rose-200 text-rose-800",
  }[urgency];

  return (
    <>
      <button
        onClick={() => setShowUpgradeModal(true)}
        className={`block w-full rounded-xl border p-3 text-left transition-opacity hover:opacity-80 ${styles}`}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <div className="flex-1">
            <p className="text-xs font-bold">
              {trialStatus.isTrialing
                ? `${trialStatus.daysRemaining} days left`
                : "Trial expired"}
            </p>
            <p className="text-xs opacity-75">
              {trialStatus.isExpired ? "Choose a plan" : "Upgrade to continue"}
            </p>
          </div>
          <ArrowRight className="h-4 w-4" />
        </div>
      </button>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={estate.subscriptionTier}
        currentBilling={estate.billingCycle}
      />
    </>
  );
}
