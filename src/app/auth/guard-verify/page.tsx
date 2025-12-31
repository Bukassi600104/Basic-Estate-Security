"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";

export default function GuardVerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [estateName, setEstateName] = useState("");
  const [guardName, setGuardName] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/guard-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          estateName,
          guardName,
          phone,
          verificationCode,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-green/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 py-6 lg:justify-center lg:py-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </div>
        </header>

        {/* Main content */}
        <main className="mt-8 flex-1 lg:mt-12">
          {/* Branding */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Security Guard Sign-in
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {step === 1 ? "Enter your estate and name" : "Enter your verification details"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <div
              className={`h-2 w-2 rounded-full ${step === 1 ? "bg-brand-navy" : "bg-slate-300"}`}
            />
            <span className={step === 1 ? "text-brand-navy" : ""}>Identity</span>
            <div className="mx-2 h-px w-8 bg-slate-200" />
            <div
              className={`h-2 w-2 rounded-full ${step === 2 ? "bg-brand-navy" : "bg-slate-300"}`}
            />
            <span className={step === 2 ? "text-brand-navy" : ""}>Verification</span>
          </div>

          {/* Form */}
          <form className="mt-8" onSubmit={onSubmit}>
            {step === 1 ? (
              <div className="space-y-4">
                {/* Estate Name */}
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Estate name</span>
                  <div className="relative mt-2">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={estateName}
                      onChange={(e) => setEstateName(e.target.value)}
                      placeholder="Blue Gardens Estate"
                      required
                    />
                  </div>
                </label>

                {/* Guard Name */}
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Your name</span>
                  <div className="relative mt-2">
                    <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={guardName}
                      onChange={(e) => setGuardName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </label>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-brand-navy/90"
                  onClick={() => {
                    if (estateName.trim().length && guardName.trim().length) setStep(2);
                  }}
                >
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Phone Number */}
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Phone number</span>
                  <div className="relative mt-2">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      placeholder="+234..."
                      required
                    />
                  </div>
                </label>

                {/* Verification Code */}
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Verification code</span>
                  <div className="relative mt-2">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium uppercase tracking-wider text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                      placeholder="BS-XX-2025"
                      required
                    />
                  </div>
                  <span className="mt-1.5 block text-xs text-slate-500">
                    Your estate admin provided this code when you were registered
                  </span>
                </label>

                {/* Password */}
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Password</span>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-14 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                {/* Error display */}
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    {error}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-base font-bold text-slate-900 transition-all hover:bg-slate-50"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-navy px-6 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-brand-navy/90 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Spinner className="text-white" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Footer link */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Are you an estate admin?{" "}
              <Link href="/auth/sign-in" className="font-semibold text-brand-navy hover:underline">
                Sign in here
              </Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
