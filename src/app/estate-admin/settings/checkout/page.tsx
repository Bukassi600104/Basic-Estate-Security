"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Check,
  CreditCard,
  Building2,
  Lock,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import {
  TIER_CONFIG,
  formatNaira,
  type SubscriptionTier,
  type BillingCycle,
} from "@/lib/subscription/tiers";

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tier and billing from URL params
  const tierParam = searchParams.get("tier") as SubscriptionTier | null;
  const billingParam = searchParams.get("billing") as BillingCycle | null;

  // Validate params
  const validTiers: SubscriptionTier[] = ["BASIC", "STANDARD", "PREMIUM"];
  const tier: SubscriptionTier | null = validTiers.includes(tierParam as SubscriptionTier)
    ? (tierParam as SubscriptionTier)
    : null;
  const billingCycle: BillingCycle = billingParam === "YEARLY" ? "YEARLY" : "MONTHLY";

  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if no valid tier
  useEffect(() => {
    if (!tier) {
      router.replace("/estate-admin/settings/subscription");
    }
  }, [tier, router]);

  if (!tier) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-navy" />
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[tier];
  const price = tierConfig.price
    ? billingCycle === "MONTHLY"
      ? tierConfig.price.monthly
      : tierConfig.price.yearly
    : 0;

  const monthlyEquivalent = tierConfig.price
    ? billingCycle === "MONTHLY"
      ? tierConfig.price.monthly
      : Math.round(tierConfig.price.yearly / 12)
    : 0;

  async function handleCheckout() {
    setLoading(true);
    // TODO: Integrate payment gateway here
    // For now, show a placeholder message
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    alert("Payment gateway coming soon! Your plan selection has been noted.");
    router.push("/estate-admin/settings/subscription");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/estate-admin/settings/subscription"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Subscription
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Complete Your Upgrade</h1>
      <p className="mt-1 text-sm text-slate-600">
        Review your plan and complete payment to upgrade.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Order Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>

          {/* Selected plan */}
          <div className="mt-6 flex items-start gap-4 rounded-xl bg-slate-50 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">{tierConfig.name} Plan</h3>
              <p className="text-sm text-slate-600">{tierConfig.description}</p>
            </div>
          </div>

          {/* Plan features */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-brand-green" />
              Up to {tierConfig.maxHouses} houses
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-brand-green" />
              {tierConfig.maxAdmins} admin account{tierConfig.maxAdmins > 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-brand-green" />
              Unlimited guards & gates
            </div>
            {tierConfig.features.exportEnabled && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-brand-green" />
                Export to Excel
              </div>
            )}
            {tierConfig.features.advancedAnalytics && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-brand-green" />
                Advanced analytics
              </div>
            )}
            {tierConfig.features.subAdminEnabled && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-brand-green" />
                Sub-admin accounts
              </div>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Billing cycle</span>
              <span className="font-semibold text-slate-900">
                {billingCycle === "YEARLY" ? "Yearly" : "Monthly"}
              </span>
            </div>
            {billingCycle === "YEARLY" && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Yearly discount</span>
                <span className="font-semibold text-brand-green">-5%</span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatNaira(price)}
                </span>
                <p className="text-xs text-slate-500">
                  {billingCycle === "YEARLY"
                    ? `(${formatNaira(monthlyEquivalent)}/month)`
                    : "per month"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Payment Details</h2>

          {/* Placeholder payment form */}
          <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <CreditCard className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              Payment Gateway Coming Soon
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;re integrating secure payment options. You&apos;ll be able to pay
              with cards, bank transfer, and more.
            </p>
          </div>

          {/* Contact info */}
          <div className="mt-6 rounded-xl bg-brand-navy/5 p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-brand-navy" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Need to pay now?
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Contact us at{" "}
                  <a
                    href="mailto:billing@basicsecurity.ng"
                    className="font-semibold text-brand-navy hover:underline"
                  >
                    billing@basicsecurity.ng
                  </a>{" "}
                  for manual payment processing.
                </p>
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <label className="mt-6 flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
            />
            <span className="text-sm text-slate-600">
              I agree to the{" "}
              <a href="#" className="font-semibold text-brand-navy hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="font-semibold text-brand-navy hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Submit button */}
          <button
            onClick={handleCheckout}
            disabled={loading || !agreedToTerms}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy py-4 text-sm font-bold text-white hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner className="text-white" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Complete Upgrade - {formatNaira(price)}
              </>
            )}
          </button>

          {/* Security note */}
          <p className="mt-4 text-center text-xs text-slate-500">
            <Lock className="mr-1 inline h-3 w-3" />
            Payments are secured with 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Spinner className="h-8 w-8 text-brand-navy" />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutPageContent />
    </Suspense>
  );
}
