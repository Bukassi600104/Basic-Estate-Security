"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle,
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

const DEFAULT_TIER = "STANDARD";
const DEFAULT_BILLING = "MONTHLY";

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      {/* Step 1 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
            step === 1
              ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
              : "bg-brand-green/20 text-brand-green"
          }`}
        >
          {step > 1 ? <CheckCircle className="h-4 w-4" /> : "1"}
        </div>
        <span className={`text-xs font-semibold ${step === 1 ? "text-white" : "text-brand-green"}`}>
          Estate Details
        </span>
      </div>

      <div className="h-px flex-1 bg-white/[0.12]" />

      {/* Step 2 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
            step === 2
              ? "bg-brand-green text-white shadow-md shadow-brand-green/30"
              : "bg-white/[0.10] text-white/40"
          }`}
        >
          2
        </div>
        <span className={`text-xs font-semibold ${step === 2 ? "text-white" : "text-white/40"}`}>
          Your Account
        </span>
      </div>
    </div>
  );
}

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Honour tier/billing params if present (from pricing page), otherwise use defaults
  const tierParam = searchParams.get("tier") ?? DEFAULT_TIER;
  const billingParam = searchParams.get("billing") ?? DEFAULT_BILLING;

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
          tier: tierParam,
          billingCycle: billingParam,
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

  function goToStep2() {
    if (estateName.trim().length && estateAddress.trim().length) {
      setStep(2);
    }
  }

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
            style={{ filter: "brightness(1.4) contrast(1.05)" }}
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0f2318]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2318]/70 via-transparent to-[#0f2318]/30" />

        {/* Floating info card */}
        <div className="absolute bottom-12 left-10 right-10">
          <div className="rounded-2xl border border-white/15 bg-[#0f2318]/75 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/20">
                <Shield className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Start protecting your estate</p>
                <p className="text-xs text-white/60">No credit card · Setup in 5 minutes</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Guest & staff codes", "Real-time validation", "Multi-gate support", "Full audit trail"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-white/65">
                  <CheckCircle className="h-3.5 w-3.5 text-brand-green flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Onboarding Wizard */}
      <div className="relative z-10 flex w-full flex-col lg:w-1/2">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
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

        {/* Wizard content */}
        <div className="flex flex-1 items-center px-6 pb-10 lg:px-12">
          <div className="w-full max-w-md mx-auto lg:mx-0">

            {/* Heading */}
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-green">
              Get Started
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Create your estate
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Set up your estate in 2 quick steps — no credit card needed.
            </p>

            {/* Step indicator */}
            <div className="mt-6">
              <StepIndicator step={step} />
            </div>

            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              {step === 1 ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                      Estate name
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={estateName}
                        onChange={(e) => setEstateName(e.target.value)}
                        placeholder="e.g. Greenville Estate"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                      Estate address
                    </label>
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
                    onClick={goToStep2}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                      Your full name
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-brand-green/50 focus:bg-white/[0.11] focus:ring-2 focus:ring-brand-green/20"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Your full name"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                      Email address
                    </label>
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                      Password
                    </label>
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
                      At least 8 characters with uppercase, lowercase, and numbers.
                    </span>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                      {error}
                    </div>
                  )}

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
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/45">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-brand-green" />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-brand-green" />
                Free 30-day trial
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-brand-green" />
                Cancel anytime
              </div>
            </div>

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

      {/* Mobile background texture */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image
          src="/images/security-guard.png"
          alt=""
          fill
          className="object-cover object-center"
          style={{ filter: "brightness(1.4)", opacity: 0.08 }}
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
