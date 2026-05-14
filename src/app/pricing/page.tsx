"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles, X } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";
import {
  TIER_CONFIG,
  type BillingCycle,
  type SubscriptionTier,
  YEARLY_DISCOUNT,
  formatNaira,
  getTierFeatureList,
} from "@/lib/subscription/tiers";
import { useState } from "react";

const tiers: SubscriptionTier[] = ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"];

function BillingSwitch({
  billingCycle,
  onChange,
}: {
  billingCycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-violet-200 bg-white p-1 shadow-sm">
      {(["MONTHLY", "YEARLY"] as BillingCycle[]).map((cycle) => (
        <button
          key={cycle}
          type="button"
          onClick={() => onChange(cycle)}
          className={`rounded-full px-5 py-2 text-sm font-black uppercase tracking-wide transition ${
            billingCycle === cycle ? "bg-violet-700 text-white" : "text-slate-500 hover:text-violet-700"
          }`}
        >
          {cycle === "YEARLY" ? `Yearly - Save ${YEARLY_DISCOUNT * 100}%` : "Monthly"}
        </button>
      ))}
    </div>
  );
}

function PricingCard({ tier, billingCycle }: { tier: SubscriptionTier; billingCycle: BillingCycle }) {
  const config = TIER_CONFIG[tier];
  const features = getTierFeatureList(tier);
  const popular = config.popular;
  const price = config.price
    ? billingCycle === "MONTHLY"
      ? config.price.monthly
      : Math.round(config.price.yearly / 12)
    : null;

  return (
    <div className={`relative flex flex-col rounded-lg border bg-white p-6 shadow-[0_22px_70px_rgba(30,41,59,0.08)] ${
      popular ? "border-violet-300 ring-4 ring-violet-100" : "border-slate-200"
    }`}>
      {popular ? (
        <div className="absolute -top-4 left-6 rounded-full bg-violet-700 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg">
          Most Popular
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">{config.name}</p>
          <h3 className="mt-3 text-3xl font-black uppercase leading-none text-slate-950">
            {price === null ? "Custom" : formatNaira(price)}
          </h3>
          {price !== null ? <p className="mt-1 text-sm font-bold text-slate-500">per month</p> : null}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
          popular ? "bg-violet-700 text-white" : "bg-emerald-50 text-emerald-700"
        }`}>
          {popular ? <Sparkles className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
        </div>
      </div>

      <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">{config.description}</p>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature.feature} className="flex items-start gap-3 text-sm font-semibold text-slate-600">
            {feature.included ? (
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <X className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
            )}
            <span>
              {feature.feature}
              {feature.value ? <span className="font-black text-slate-950"> ({feature.value})</span> : null}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={tier === "ENTERPRISE" ? "mailto:support@gatepilot.ng?subject=Enterprise%20Plan" : `/auth/sign-up?tier=${tier}&billing=${billingCycle}`}
        className={popular ? "gp-button-primary mt-8 w-full" : "gp-button-secondary mt-8 w-full"}
      >
        {tier === "ENTERPRISE" ? "Contact Sales" : "Start 30-Day Trial"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");

  return (
    <div className="gp-page">
      <MarketingHeader />
      <main className="pt-28">
        <section className="relative overflow-hidden bg-white pb-16 pt-12">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-violet-700" />
          <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-4xl">
              <div className="gp-kicker">
                <ShieldCheck className="h-4 w-4" />
                30-day trial stays standard
              </div>
              <h1 className="gp-display mt-6 text-6xl sm:text-7xl lg:text-8xl">
                Clear
                <span className="block">Pricing.</span>
                <span className="gp-display-mark mt-2">No Guesswork.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                Pick the plan that matches your estate size. The 90-day pilot can be handled by the owner from super admin without changing public pricing.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 lg:py-20">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="gp-panel-title">Choose billing</p>
                <h2 className="mt-2 text-3xl font-black uppercase text-slate-950">Estate plans</h2>
              </div>
              <BillingSwitch billingCycle={billingCycle} onChange={setBillingCycle} />
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {tiers.map((tier) => (
                <PricingCard key={tier} tier={tier} billingCycle={billingCycle} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-violet-700 py-16 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
            <h2 className="gp-display text-5xl text-white sm:text-6xl">
              Pilot estate?
              <span className="block text-emerald-300">Use owner controls.</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {["Mark one estate as pilot", "Grant 90 active days", "Return to public pricing anytime"].map((item) => (
                <div key={item} className="rounded-lg border border-white/20 bg-white/10 p-5">
                  <Check className="h-6 w-6 text-emerald-300" />
                  <p className="mt-4 text-sm font-black uppercase leading-5">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
