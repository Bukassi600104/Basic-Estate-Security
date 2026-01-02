"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  Shield,
  Clock,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { EstateRecord } from "@/lib/repos/estates";
import {
  TIER_CONFIG,
  formatNaira,
  type SubscriptionTier,
} from "@/lib/subscription/tiers";
import {
  getTrialStatus,
  formatTrialStatus,
  getTrialUrgency,
} from "@/lib/subscription/trial-check";

export default function SubscriptionPage() {
  const [estate, setEstate] = useState<EstateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ houses: number; admins: number } | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch("/api/estate-admin/subscription");
      const data = await res.json();

      if (res.ok) {
        setEstate(data.estate);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-navy" />
      </div>
    );
  }

  if (!estate) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-slate-600">Unable to load subscription details.</p>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[estate.subscriptionTier];
  const trialStatus = getTrialStatus(estate);
  const urgency = getTrialUrgency(estate);

  const price = tierConfig.price
    ? estate.billingCycle === "MONTHLY"
      ? tierConfig.price.monthly
      : Math.round(tierConfig.price.yearly / 12)
    : null;

  const urgencyStyles = {
    normal: {
      badge: "bg-brand-green/10 text-brand-green-700",
      border: "border-brand-green/30",
    },
    warning: {
      badge: "bg-amber-100 text-amber-700",
      border: "border-amber-200",
    },
    critical: {
      badge: "bg-rose-100 text-rose-700",
      border: "border-rose-200",
    },
  }[urgency];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/estate-admin/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
      <p className="mt-1 text-sm text-slate-600">
        Manage your estate&apos;s subscription plan and billing.
      </p>

      {/* Current Plan */}
      <div className={`mt-8 rounded-2xl border bg-white p-6 ${urgencyStyles.border}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {tierConfig.name} Plan
              </h2>
              <p className="text-sm text-slate-600">{tierConfig.description}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${urgencyStyles.badge}`}>
            {formatTrialStatus(estate)}
          </span>
        </div>

        {/* Trial info */}
        {trialStatus.isTrialing && (
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <Clock className="h-5 w-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                {trialStatus.isExpired
                  ? "Your trial has expired"
                  : trialStatus.daysRemaining === 1
                    ? "Your trial ends tomorrow"
                    : `${trialStatus.daysRemaining} days remaining in your trial`}
              </p>
              <p className="text-xs text-slate-500">
                {trialStatus.trialEndsAt &&
                  `Ends ${trialStatus.trialEndsAt.toLocaleDateString("en-NG", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}`}
              </p>
            </div>
            {trialStatus.isExpired || trialStatus.isExpiringSoon ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : null}
          </div>
        )}

        {/* Pricing */}
        <div className="mt-6 border-t border-slate-100 pt-6">
          {price !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatNaira(price)}
              </span>
              <span className="text-slate-500">/month</span>
              {estate.billingCycle === "YEARLY" && (
                <span className="ml-2 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-semibold text-brand-green-700">
                  Yearly (save 5%)
                </span>
              )}
            </div>
          ) : (
            <span className="text-xl font-bold text-slate-900">Custom Pricing</span>
          )}
        </div>

        {/* Upgrade button */}
        <div className="mt-6">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white hover:bg-brand-navy-700"
          >
            {estate.subscriptionTier === "PREMIUM" ? "View Plans" : "Upgrade Plan"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Houses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Houses</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.houses ?? 0}
                <span className="text-lg text-slate-400">
                  {" / "}
                  {estate.maxHouses === Infinity ? "Unlimited" : estate.maxHouses}
                </span>
              </p>
            </div>
          </div>
          {estate.maxHouses !== Infinity && stats && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-navy transition-all"
                  style={{
                    width: `${Math.min(100, (stats.houses / estate.maxHouses) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {Math.round((stats.houses / estate.maxHouses) * 100)}% used
              </p>
            </div>
          )}
        </div>

        {/* Admins */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Admin Accounts</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.admins ?? 1}
                <span className="text-lg text-slate-400">
                  {" / "}
                  {estate.maxAdmins === Infinity ? "Unlimited" : estate.maxAdmins}
                </span>
              </p>
            </div>
          </div>
          {estate.maxAdmins !== Infinity && stats && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-navy transition-all"
                  style={{
                    width: `${Math.min(100, (stats.admins / estate.maxAdmins) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {Math.round((stats.admins / estate.maxAdmins) * 100)}% used
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Plan Features</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-brand-green" />
            <span className="text-sm text-slate-700">Unlimited guards</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-brand-green" />
            <span className="text-sm text-slate-700">Unlimited gates</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-brand-green" />
            <span className="text-sm text-slate-700">Unlimited access codes</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-brand-green" />
            <span className="text-sm text-slate-700">Validation logs</span>
          </div>
          <div className="flex items-center gap-3">
            {estate.features?.exportEnabled ? (
              <Check className="h-5 w-5 text-brand-green" />
            ) : (
              <span className="h-5 w-5 text-center text-slate-300">-</span>
            )}
            <span className={estate.features?.exportEnabled ? "text-sm text-slate-700" : "text-sm text-slate-400"}>
              Export to Excel
            </span>
          </div>
          <div className="flex items-center gap-3">
            {estate.features?.advancedAnalytics ? (
              <Check className="h-5 w-5 text-brand-green" />
            ) : (
              <span className="h-5 w-5 text-center text-slate-300">-</span>
            )}
            <span className={estate.features?.advancedAnalytics ? "text-sm text-slate-700" : "text-sm text-slate-400"}>
              Advanced analytics
            </span>
          </div>
          <div className="flex items-center gap-3">
            {estate.features?.subAdminEnabled ? (
              <Check className="h-5 w-5 text-brand-green" />
            ) : (
              <span className="h-5 w-5 text-center text-slate-300">-</span>
            )}
            <span className={estate.features?.subAdminEnabled ? "text-sm text-slate-700" : "text-sm text-slate-400"}>
              Sub-admin accounts
            </span>
          </div>
        </div>
      </div>

      {/* Help section */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">
          Need help with your subscription?{" "}
          <a
            href="mailto:support@basicsecurity.ng"
            className="font-semibold text-brand-navy hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
