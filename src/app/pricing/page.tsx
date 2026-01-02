"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  X,
  Building2,
  Users,
  Shield,
  Sparkles,
  Menu,
  X as CloseIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  TIER_CONFIG,
  type SubscriptionTier,
  type BillingCycle,
  getTierFeatureList,
  formatNaira,
  YEARLY_DISCOUNT,
} from "@/lib/subscription/tiers";

const tiers: SubscriptionTier[] = ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"];

function PricingToggle({
  billingCycle,
  onChange,
}: {
  billingCycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm font-medium ${
          billingCycle === "MONTHLY" ? "text-slate-900" : "text-slate-500"
        }`}
      >
        Monthly
      </span>
      <button
        onClick={() => onChange(billingCycle === "MONTHLY" ? "YEARLY" : "MONTHLY")}
        className="relative h-8 w-14 rounded-full bg-brand-navy transition-colors"
        aria-label="Toggle billing cycle"
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all ${
            billingCycle === "YEARLY" ? "left-7" : "left-1"
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium ${
          billingCycle === "YEARLY" ? "text-slate-900" : "text-slate-500"
        }`}
      >
        Yearly
        <span className="ml-1 inline-flex items-center rounded-full bg-brand-green/20 px-2 py-0.5 text-xs font-semibold text-brand-green-700">
          Save {YEARLY_DISCOUNT * 100}%
        </span>
      </span>
    </div>
  );
}

function PricingCard({
  tier,
  billingCycle,
}: {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
}) {
  const config = TIER_CONFIG[tier];
  const features = getTierFeatureList(tier);
  const isPopular = config.popular;
  const isEnterprise = tier === "ENTERPRISE";

  const price = config.price
    ? billingCycle === "MONTHLY"
      ? config.price.monthly
      : config.price.yearly
    : null;

  const monthlyEquivalent =
    config.price && billingCycle === "YEARLY"
      ? Math.round(config.price.yearly / 12)
      : null;

  const tierIcon = {
    BASIC: <Building2 className="h-6 w-6" />,
    STANDARD: <Users className="h-6 w-6" />,
    PREMIUM: <Shield className="h-6 w-6" />,
    ENTERPRISE: <Sparkles className="h-6 w-6" />,
  }[tier];

  return (
    <div
      className={`relative flex flex-col rounded-3xl border-2 bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
        isPopular
          ? "border-brand-green shadow-brand-green/20"
          : "border-slate-200 hover:border-brand-navy/30"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-4 py-1.5 text-sm font-bold text-white shadow-lg">
            <Sparkles className="h-4 w-4" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${
            isPopular
              ? "bg-brand-green/20 text-brand-green"
              : "bg-brand-navy/10 text-brand-navy"
          }`}
        >
          {tierIcon}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900">{config.name}</h3>
      <p className="mt-2 text-sm text-slate-600">{config.description}</p>

      <div className="mt-6">
        {price !== null ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-900">
                {formatNaira(billingCycle === "MONTHLY" ? price : monthlyEquivalent!)}
              </span>
              <span className="text-slate-500">/month</span>
            </div>
            {billingCycle === "YEARLY" && (
              <p className="mt-1 text-sm text-slate-500">
                Billed {formatNaira(price)} yearly
              </p>
            )}
          </>
        ) : (
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold text-slate-900">Custom</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex-1">
        <p className="mb-4 text-sm font-semibold text-slate-700">What&apos;s included:</p>
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              {feature.included ? (
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-green" />
              ) : (
                <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-300" />
              )}
              <span
                className={`text-sm ${
                  feature.included ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {feature.feature}
                {feature.value && (
                  <span className="ml-1 font-semibold text-slate-900">
                    ({feature.value})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        {isEnterprise ? (
          <Link
            href="mailto:support@basicsecurity.ng?subject=Enterprise%20Plan%20Inquiry"
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-brand-navy bg-white px-6 py-3 text-base font-bold text-brand-navy transition-all hover:bg-brand-navy hover:text-white"
          >
            Contact Sales
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            href={`/auth/sign-up?tier=${tier}&billing=${billingCycle}`}
            className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-bold transition-all ${
              isPopular
                ? "bg-brand-green text-white shadow-lg hover:bg-brand-green-600 hover:shadow-xl"
                : "bg-brand-navy text-white shadow-lg hover:bg-brand-navy-700 hover:shadow-xl"
            }`}
          >
            Start 30-Day Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" showText={true} />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              href="/auth/resident-verify"
            >
              Residents
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              href="/auth/guard-verify"
            >
              Security Guards
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              href="/auth/sign-in"
            >
              Admin Login
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                href="/auth/resident-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Residents
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                href="/auth/guard-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security Guards
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                href="/auth/sign-in"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="py-16 md:py-24">
        {/* Hero */}
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Choose the plan that fits your estate. All plans include a{" "}
            <span className="font-semibold text-brand-green">30-day free trial</span>.
            No credit card required.
          </p>

          {/* Billing toggle */}
          <div className="mt-10">
            <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto mt-16 max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <PricingCard key={tier} tier={tier} billingCycle={billingCycle} />
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mx-auto mt-24 max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>

          <div className="mt-10 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">
                What happens after the 30-day free trial?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                After your trial ends, you&apos;ll need to subscribe to continue using the
                platform. All your data will be preserved. You can upgrade, downgrade, or
                cancel at any time.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">
                Can I change my plan later?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Yes! You can upgrade or downgrade your plan at any time. When upgrading,
                you&apos;ll get immediate access to new features. When downgrading, changes
                take effect at the next billing cycle.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">
                What payment methods do you accept?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                We accept bank transfers, cards, and mobile money through our Nigerian
                payment partners. Payment details will be provided before your trial ends.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">
                What counts as a &quot;house&quot; or &quot;unit&quot;?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Each residential unit that can have residents onboarded counts as one
                house. This includes apartments, duplexes, or standalone houses within
                your estate.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mx-auto mt-24 max-w-7xl px-6">
          <div className="rounded-3xl bg-brand-navy p-12 text-center lg:p-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Ready to secure your estate?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-green-100">
              Start your 30-day free trial today. No credit card required.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/sign-up?tier=STANDARD&billing=MONTHLY"
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-brand-green-400 hover:shadow-xl"
              >
                Get Started with Standard
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo size="md" showText={true} />
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link
                href="/auth/resident-verify"
                className="transition-colors hover:text-brand-navy"
              >
                Residents
              </Link>
              <Link
                href="/auth/guard-verify"
                className="transition-colors hover:text-brand-navy"
              >
                Guards
              </Link>
              <Link
                href="/auth/sign-in"
                className="transition-colors hover:text-brand-navy"
              >
                Admin
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Basic Security. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
