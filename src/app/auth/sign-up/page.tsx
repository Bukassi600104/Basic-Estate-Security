"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  MapPin,
  Shield,
  User,
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

  const tierParam = searchParams.get("tier") as SubscriptionTier | null;
  const billingParam = searchParams.get("billing") as BillingCycle | null;

  const tier: SubscriptionTier = ["BASIC", "STANDARD", "PREMIUM"].includes(tierParam as SubscriptionTier)
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
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const validTiers = ["BASIC", "STANDARD", "PREMIUM"];
    if (!tierParam || !validTiers.includes(tierParam)) {
      router.replace("/pricing");
    }
  }, [tierParam, router]);

  useEffect(() => {
    function handleScroll() {
      setScrollY(window.scrollY);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  if (!tierParam || !["BASIC", "STANDARD", "PREMIUM"].includes(tierParam as SubscriptionTier)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f2318]">
        <Spinner className="h-8 w-8 text-brand-green" />
      </div>
    );
  }

  const price = tierConfig.price
    ? billingCycle === "MONTHLY"
      ? tierConfig.price.monthly
      : Math.round(tierConfig.price.yearly / 12)
    : 0;

  return (
    <div className="flex min-h-[100dvh] bg-[#0f2318]">
      {/* Left side — Security Guard Image with Parallax */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        >
          <Image
            src="/images/security-guard.png"
            alt="Security Guard"
            fill
            className="object-cover object-center"
            style={{ filter: 'brightness(1.4) contrast(1.05)' }}
            priority
          />
        </div>
        {/* Light gradient on right edge only */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0f2318]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2318]/70 via-transparent to-[#0f2318]/30" />

        {/* Floating plan info card */}
        <div className="absolute bottom-12 left-10 right-10">
          <div className="rounded-2xl border border-white/15 bg-[#0f2318]/75 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/20">
                <Clock className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{TRIAL_DURATION_DAYS}-day free trial</p>
                <p className="text-xs text-white/60">No credit card required to start</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs text-white/65">
                <Check className="h-3.5 w-3.5 text-brand-green" />
                Up to {tierConfig.maxHouses} houses
              </div>
              <div className="flex items-center gap-2 text-xs text-white/65">
                <Check className="h-3.5 w-3.5 text-brand-green" />
                Unlimited guards
              </div>
              <div className="flex items-center gap-2 text-xs text-white/65">
                <Check className="h-3.5 w-3.5 text-brand-green" />
                Unlimited codes
              </div>
              <div className="flex items-center gap-2 text-xs text-white/65">
                <Check className="h-3.5 w-3.5 text-brand-green" />
                Full access
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="relative z-10 flex w-full flex-col lg:w-1/2">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/30 bg-brand-green/10">
                <Shield className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-white">Basic Estate</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green">Security</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
            <Globe className="h-3.5 w-3.5" />
            EN
          </div>
        </header>

        {/* Form area */}
        <div className="flex flex-1 items-center px-6 pb-10 lg:px-12">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {/* Plan badge */}
            <div className="flex items-center gap-3 rounded-lg border border-brand-green/20 bg-brand-green/[0.07] p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/15">
                <Shield className="h-4 w-4 text-brand-green" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{tierConfig.name} Plan</p>
                <p className="text-xs text-white/55">
                  {formatNaira(price)}/month &middot; {TRIAL_DURATION_DAYS}-day free trial
                </p>
              </div>
              <Link href="/pricing" className="text-xs font-semibold text-brand-green hover:text-brand-green-300">
                Change
              </Link>
            </div>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Create your estate
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Set up your estate admin account to get started.
            </p>

            {/* Step indicator */}
            <div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/45">
              <div className={`h-2 w-2 rounded-full ${step === 1 ? "bg-brand-green" : "bg-white/25"}`} />
              <span className={step === 1 ? "text-brand-green" : ""}>Estate details</span>
              <div className="mx-2 h-px flex-1 bg-white/[0.12]" />
              <div className={`h-2 w-2 rounded-full ${step === 2 ? "bg-brand-green" : "bg-white/25"}`} />
              <span className={step === 2 ? "text-brand-green" : ""}>Admin account</span>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              {step === 1 ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">Estate name</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={estateName}
                        onChange={(e) => setEstateName(e.target.value)}
                        placeholder="e.g. Jehova Elohim Estate"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">Estate address</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={estateAddress}
                        onChange={(e) => setEstateAddress(e.target.value)}
                        placeholder="e.g. 12 Estate Road, Lagos"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-green-600 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40 hover:-translate-y-0.5"
                    onClick={() => {
                      if (estateName.trim().length && estateAddress.trim().length) setStep(2);
                    }}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">Admin name</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="admin@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-12 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/45 transition-colors hover:text-white/70"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <span className="mt-1.5 block text-xs text-white/45">
                      Use at least 8 characters with uppercase, lowercase, and numbers.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-5 text-sm font-bold text-white/75 transition-all hover:bg-white/[0.12]"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex flex-1 h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-green-600 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                    >
                      {loading ? (
                        <>
                          <Spinner className="text-white" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Start free trial
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {error}
                </div>
              )}
            </form>

            <div className="mt-6 text-sm text-white/55">
              Already have an account?{" "}
              <Link className="font-bold text-brand-green hover:text-brand-green-300" href="/auth/sign-in">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.10] px-6 py-4 lg:px-10">
          <p className="text-xs text-white/35">
            &copy; {new Date().getFullYear()} Basic Estate Security. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-white/35">
            <span className="cursor-pointer hover:text-white/55">Privacy Policy</span>
            <span className="cursor-pointer hover:text-white/55">Terms of Service</span>
          </div>
        </footer>
      </div>

      {/* Mobile background image (faint texture) */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image
          src="/images/security-guard.png"
          alt=""
          fill
          className="object-cover object-center"
          style={{ filter: 'brightness(1.4)', opacity: 0.08 }}
        />
      </div>
    </div>
  );
}

function SignUpPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f2318]">
      <Spinner className="h-8 w-8 text-brand-green" />
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
