"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  User,
  UserPlus,
  Check,
  Clock,
  Shield,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import {
  TIER_CONFIG,
  type SubscriptionTier,
  type BillingCycle,
  formatNaira,
  TRIAL_DURATION_DAYS,
} from "@/lib/subscription/tiers";

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tier and billing from URL params
  const tierParam = searchParams.get("tier") as SubscriptionTier | null;
  const billingParam = searchParams.get("billing") as BillingCycle | null;

  // Validate tier param
  const validTiers: SubscriptionTier[] = ["BASIC", "STANDARD", "PREMIUM"];
  const tier: SubscriptionTier = validTiers.includes(tierParam as SubscriptionTier)
    ? (tierParam as SubscriptionTier)
    : "BASIC";
  const billingCycle: BillingCycle = billingParam === "YEARLY" ? "YEARLY" : "MONTHLY";

  const tierConfig = TIER_CONFIG[tier];

  const [step, setStep] = useState<1 | 2>(1);
  const [estateName, setEstateName] = useState("");
  const [estateAddress, setEstateAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to pricing if no valid tier is specified
  useEffect(() => {
    if (!tierParam || !validTiers.includes(tierParam as SubscriptionTier)) {
      router.replace("/pricing");
    }
  }, [tierParam, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          estateName,
          estateAddress,
          adminName,
          email,
          password,
          tier,
          billingCycle,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // If account already exists, redirect to sign-in
        if (data?.code === "ACCOUNT_EXISTS") {
          router.push(`/auth/sign-in?email=${encodeURIComponent(email)}&message=account_exists`);
          return;
        }
        throw new Error(data.error ?? "Sign-up failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  // Don't render if redirecting
  if (!tierParam || !validTiers.includes(tierParam as SubscriptionTier)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-navy" />
      </div>
    );
  }

  const price = tierConfig.price
    ? billingCycle === "MONTHLY"
      ? tierConfig.price.monthly
      : Math.round(tierConfig.price.yearly / 12)
    : 0;

  return (
    <div className="min-h-[100dvh] bg-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand-navy/10 blur-[128px]" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-brand-green/10 blur-[128px]" />
      </div>

      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <Link
                href="/pricing"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Change plan
                </span>
              </Link>
              <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 sm:flex">
                <UserPlus className="h-4 w-4" />
                Estate setup
              </div>
            </div>

            {/* Selected plan badge */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/20">
                <Shield className="h-5 w-5 text-brand-green" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{tierConfig.name} Plan</p>
                <p className="text-xs text-slate-600">
                  {formatNaira(price)}/month • {billingCycle === "YEARLY" ? "Billed yearly" : "Billed monthly"}
                </p>
              </div>
            </div>

            <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-slate-900">
              Create your estate
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Set up an estate admin account for Basic Security.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-500">
              <div
                className={
                  "h-2 w-2 rounded-full " +
                  (step === 1 ? "bg-blue-600" : "bg-slate-300")
                }
              />
              Estate details
              <div className="mx-2 h-px flex-1 bg-slate-200" />
              <div
                className={
                  "h-2 w-2 rounded-full " +
                  (step === 2 ? "bg-blue-600" : "bg-slate-300")
                }
              />
              Admin account
            </div>

            <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
              {step === 1 ? (
                <>
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Estate name</span>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={estateName}
                        onChange={(e) => setEstateName(e.target.value)}
                        required
                      />
                    </div>
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Estate address</span>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={estateAddress}
                        onChange={(e) => setEstateAddress(e.target.value)}
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-navy px-5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-navy/90"
                    onClick={() => {
                      if (estateName.trim().length && estateAddress.trim().length) setStep(2);
                    }}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Admin name</span>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                      />
                    </div>
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Email</span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Password</span>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-600 hover:bg-slate-100"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Use at least 8 characters. Prefer a mix of uppercase, lowercase, and numbers.
                    </span>
                  </label>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                    Never share your password. Store credentials securely.
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-navy px-5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Spinner className="text-white" />
                          Creating…
                        </>
                      ) : (
                        <>
                          Start free trial
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  {error}
                </div>
              ) : null}

            </form>

            <div className="mt-8 text-sm text-slate-600">
              Already have an account?{" "}
              <Link className="font-extrabold text-slate-900" href="/auth/sign-in">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Right sidebar - Plan summary */}
        <div className="relative hidden overflow-hidden border-l border-slate-200 bg-slate-900 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/25 via-slate-900 to-indigo-600/15" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-12">
            {/* Plan info */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-green/20 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-brand-green">
                <Clock className="h-4 w-4" />
                {TRIAL_DURATION_DAYS}-day free trial
              </div>

              <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
                {tierConfig.name} Plan
              </h2>

              <div className="mt-4">
                <span className="text-4xl font-extrabold text-white">
                  {formatNaira(price)}
                </span>
                <span className="text-white/70">/month</span>
              </div>

              {billingCycle === "YEARLY" && tierConfig.price && (
                <p className="mt-2 text-sm text-white/60">
                  Billed {formatNaira(tierConfig.price.yearly)} yearly (save 5%)
                </p>
              )}

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Check className="h-5 w-5 text-brand-green" />
                  Up to {tierConfig.maxHouses} houses
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Check className="h-5 w-5 text-brand-green" />
                  {tierConfig.maxAdmins} admin account{tierConfig.maxAdmins > 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Check className="h-5 w-5 text-brand-green" />
                  Unlimited guards & gates
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Check className="h-5 w-5 text-brand-green" />
                  Unlimited access codes
                </div>
                {tierConfig.features.exportEnabled && (
                  <div className="flex items-center gap-3 text-sm text-white/80">
                    <Check className="h-5 w-5 text-brand-green" />
                    Export to Excel
                  </div>
                )}
                {tierConfig.features.advancedAnalytics && (
                  <div className="flex items-center gap-3 text-sm text-white/80">
                    <Check className="h-5 w-5 text-brand-green" />
                    Advanced analytics
                  </div>
                )}
                {tierConfig.features.subAdminEnabled && (
                  <div className="flex items-center gap-3 text-sm text-white/80">
                    <Check className="h-5 w-5 text-brand-green" />
                    Sub-admin accounts
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-auto pt-8">
              <div className="rounded-2xl bg-white/10 p-6">
                <p className="text-sm font-semibold text-white">
                  No payment required today
                </p>
                <p className="mt-2 text-xs text-white/70">
                  Your {TRIAL_DURATION_DAYS}-day free trial starts when you create your estate.
                  After the trial, you&apos;ll need to subscribe to continue using all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignUpPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Spinner className="h-8 w-8 text-brand-navy" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpPageLoading />}>
      <SignUpPageContent />
    </Suspense>
  );
}
