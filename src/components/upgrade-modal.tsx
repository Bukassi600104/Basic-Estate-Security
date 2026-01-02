"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Crown, Building2, Zap, ArrowRight } from "lucide-react";
import {
  TIER_CONFIG,
  formatNaira,
  type SubscriptionTier,
  type BillingCycle,
} from "@/lib/subscription/tiers";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  currentBilling: BillingCycle;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  currentBilling,
}: UpgradeModalProps) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(currentBilling);

  if (!isOpen) return null;

  const tiers: SubscriptionTier[] = ["BASIC", "STANDARD", "PREMIUM"];
  const currentTierIndex = tiers.indexOf(currentTier);

  function handleSelectTier(tier: SubscriptionTier) {
    // Navigate to checkout with selected tier
    router.push(
      `/estate-admin/settings/checkout?tier=${tier}&billing=${billingCycle}`
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Upgrade Your Plan
            </h2>
            <p className="text-sm text-slate-600">
              Choose a plan that fits your estate&apos;s needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center px-6 pt-6">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("YEARLY")}
              className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${
                billingCycle === "YEARLY"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Yearly
              <span className="ml-2 rounded-full bg-brand-green/20 px-2 py-0.5 text-xs font-bold text-brand-green">
                Save 5%
              </span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          {tiers.map((tier, index) => {
            const config = TIER_CONFIG[tier];
            const price = config.price
              ? billingCycle === "MONTHLY"
                ? config.price.monthly
                : Math.round(config.price.yearly / 12)
              : 0;

            const isCurrentTier = tier === currentTier;
            const isDowngrade = index < currentTierIndex;
            const isUpgrade = index > currentTierIndex;

            return (
              <div
                key={tier}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  config.popular
                    ? "border-brand-navy bg-brand-navy/5"
                    : isCurrentTier
                      ? "border-brand-green bg-brand-green/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* Popular badge */}
                {config.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-navy px-3 py-1 text-xs font-bold text-white">
                      <Crown className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current tier badge */}
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-3 py-1 text-xs font-bold text-white">
                      <Check className="h-3 w-3" />
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Tier icon */}
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                    tier === "BASIC"
                      ? "bg-slate-100 text-slate-600"
                      : tier === "STANDARD"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-purple-100 text-purple-600"
                  }`}
                >
                  {tier === "BASIC" ? (
                    <Building2 className="h-6 w-6" />
                  ) : tier === "STANDARD" ? (
                    <Zap className="h-6 w-6" />
                  ) : (
                    <Crown className="h-6 w-6" />
                  )}
                </div>

                {/* Tier name and price */}
                <h3 className="text-lg font-extrabold text-slate-900">
                  {config.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{config.description}</p>

                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {formatNaira(price)}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>

                {billingCycle === "YEARLY" && config.price && (
                  <p className="mt-1 text-xs text-slate-500">
                    Billed {formatNaira(config.price.yearly)} yearly
                  </p>
                )}

                {/* Features */}
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-brand-green" />
                    Up to {config.maxHouses} houses
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-brand-green" />
                    {config.maxAdmins} admin{config.maxAdmins > 1 ? "s" : ""}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-brand-green" />
                    Unlimited guards & gates
                  </li>
                  {config.features.exportEnabled && (
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 text-brand-green" />
                      Export to Excel
                    </li>
                  )}
                  {config.features.advancedAnalytics && (
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 text-brand-green" />
                      Advanced analytics
                    </li>
                  )}
                  {config.features.subAdminEnabled && (
                    <li className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 text-brand-green" />
                      Sub-admin accounts
                    </li>
                  )}
                </ul>

                {/* Action button */}
                <div className="mt-6">
                  {isCurrentTier ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-400"
                    >
                      Current Plan
                    </button>
                  ) : isDowngrade ? (
                    <button
                      onClick={() => handleSelectTier(tier)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Downgrade
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectTier(tier)}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white ${
                        config.popular
                          ? "bg-brand-navy hover:bg-brand-navy/90"
                          : "bg-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      Upgrade
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise callout */}
        <div className="mx-6 mb-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-center">
          <h3 className="text-lg font-extrabold text-white">
            Need more than 100 houses?
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            Contact us for Enterprise pricing with unlimited houses and dedicated support.
          </p>
          <a
            href="mailto:sales@basicsecurity.ng"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
          >
            Contact Sales
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
