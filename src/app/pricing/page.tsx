"use client";

import { useState, useEffect } from "react";
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
          billingCycle === "MONTHLY" ? "text-white" : "text-white/55"
        }`}
      >
        Monthly
      </span>
      <button
        onClick={() => onChange(billingCycle === "MONTHLY" ? "YEARLY" : "MONTHLY")}
        className="relative h-8 w-14 rounded-full bg-white/[0.12] border border-white/15 transition-colors"
        aria-label="Toggle billing cycle"
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-brand-green shadow-md transition-all ${
            billingCycle === "YEARLY" ? "left-7" : "left-1"
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium ${
          billingCycle === "YEARLY" ? "text-white" : "text-white/55"
        }`}
      >
        Yearly
        <span className="ml-1 inline-flex items-center rounded-full bg-brand-green/20 px-2 py-0.5 text-xs font-semibold text-brand-green">
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
      className={`relative flex flex-col rounded-3xl border-2 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isPopular
          ? "border-brand-green bg-white/[0.09] shadow-brand-green/15 shadow-lg"
          : "border-white/[0.12] bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.09]"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-brand-green/30">
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
              : "bg-white/[0.10] text-white/75"
          }`}
        >
          {tierIcon}
        </div>
      </div>

      <h3 className="text-xl font-bold text-white">{config.name}</h3>
      <p className="mt-2 text-sm text-white/60">{config.description}</p>

      <div className="mt-6">
        {price !== null ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">
                {formatNaira(billingCycle === "MONTHLY" ? price : monthlyEquivalent!)}
              </span>
              <span className="text-white/55">/month</span>
            </div>
            {billingCycle === "YEARLY" && (
              <p className="mt-1 text-sm text-white/55">
                Billed {formatNaira(price)} yearly
              </p>
            )}
          </>
        ) : (
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold text-white">Custom</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex-1">
        <p className="mb-4 text-sm font-semibold text-white/70">What&apos;s included:</p>
        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              {feature.included ? (
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-green" />
              ) : (
                <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/30" />
              )}
              <span
                className={`text-sm ${
                  feature.included ? "text-white/70" : "text-white/40"
                }`}
              >
                {feature.feature}
                {feature.value && (
                  <span className="ml-1 font-semibold text-white">
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
            href="mailto:support@gatepilot.ng?subject=Enterprise%20Plan%20Inquiry"
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/[0.07] px-6 py-3 text-base font-bold text-white transition-all hover:bg-white/[0.12] hover:border-white/35"
          >
            Contact Sales
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            href={`/auth/sign-up?tier=${tier}&billing=${billingCycle}`}
            className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-bold transition-all hover:-translate-y-0.5 ${
              isPopular
                ? "bg-brand-green text-white shadow-lg shadow-brand-green/30 hover:bg-brand-green-600 hover:shadow-brand-green/40 hover:shadow-xl"
                : "bg-gradient-to-r from-brand-green to-brand-green-600 text-white shadow-lg hover:shadow-xl"
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f2318]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 right-1/4 h-96 w-96 rounded-full bg-brand-green/8 blur-[128px]" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-brand-green/6 blur-[100px]" />
      </div>

      {/* Header — consistent with home page */}
      <header
        className={`fixed left-0 right-0 top-0 z-30 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/[0.12] bg-[#0f2318]/95 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" showText={true} />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              href="/auth/resident-verify"
            >
              Residents
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              href="/auth/guard-verify"
            >
              Security Guards
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              href="/auth/sign-in"
            >
              Admin Login
            </Link>
          </nav>

          <button
            className="rounded-xl p-2 text-white/70 hover:bg-white/[0.08] md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <CloseIcon className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/[0.12] bg-[#0f2318]/97 px-6 py-4 md:hidden backdrop-blur-xl">
            <nav className="flex flex-col gap-2">
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                href="/auth/resident-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Residents
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                href="/auth/guard-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security Guards
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                href="/auth/sign-in"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="pt-28 pb-16 md:pt-36 md:pb-24">
        {/* Hero */}
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green mb-6">
            <Shield className="h-4 w-4" />
            30-day free trial on all plans
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            Choose the plan that fits your estate. All plans include a{" "}
            <span className="font-semibold text-brand-green">30-day free trial</span>.
            No credit card required.
          </p>

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
          <h2 className="text-center text-2xl font-bold text-white">
            Frequently Asked Questions
          </h2>

          <div className="mt-10 space-y-4">
            {[
              {
                q: "What happens after the 30-day free trial?",
                a: "After your trial ends, you'll need to subscribe to continue using the platform. All your data will be preserved. You can upgrade, downgrade, or cancel at any time.",
              },
              {
                q: "Can I change my plan later?",
                a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept bank transfers, cards, and mobile money through our Nigerian payment partners. Payment details will be provided before your trial ends.",
              },
              {
                q: "What counts as a \"house\" or \"unit\"?",
                a: "Each residential unit that can have residents onboarded counts as one house. This includes apartments, duplexes, or standalone houses within your estate.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 transition-all hover:bg-white/[0.09] hover:border-white/20">
                <h3 className="font-semibold text-white">{item.q}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section — consistent with home page */}
        <div className="mx-auto mt-24 max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.15] bg-white/[0.05] backdrop-blur p-12 text-center lg:p-16 shadow-xl">
            <div className="absolute inset-0 opacity-[0.10]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(rgba(74, 222, 128, 0.4) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-brand-green/8 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                Ready to secure your estate?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
                Start your 30-day free trial today. No credit card required.
              </p>
              <div className="mt-8">
                <Link
                  href="/auth/sign-up?tier=STANDARD&billing=MONTHLY"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40 hover:-translate-y-0.5"
                >
                  Get Started with Standard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — consistent with home page */}
      <footer className="border-t border-white/[0.12]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo size="md" showText={true} />
            <div className="flex items-center gap-6 text-sm text-white/55">
              <Link href="/auth/resident-verify" className="transition-colors hover:text-brand-green">
                Residents
              </Link>
              <Link href="/auth/guard-verify" className="transition-colors hover:text-brand-green">
                Guards
              </Link>
              <Link href="/auth/sign-in" className="transition-colors hover:text-brand-green">
                Admin
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-white/[0.08] pt-8 text-center text-sm text-white/35">
            © {new Date().getFullYear()} GatePilot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
