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
  User,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";

export default function ResidentVerifyPage() {
  const router = useRouter();
  const [estateName, setEstateName] = useState("");
  const [residentName, setResidentName] = useState("");
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
      const res = await fetch("/api/auth/resident-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          estateName,
          residentName,
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-green/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-[100dvh] max-h-[100dvh] max-w-lg flex-col px-5 py-6 lg:justify-center lg:py-12 overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between page-enter">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md touch-target"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Resident</span>
          </div>
        </header>

        {/* Main content */}
        <main className="mt-8 flex-1 lg:mt-12 page-enter">
          {/* Branding */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
              <User className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Resident Sign-in
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your estate details and verification code
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 stagger-children" onSubmit={onSubmit}>
            <div className="space-y-4">
              {/* Estate Name */}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Estate name</span>
                <div className="relative mt-2">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-600/20"
                    value={estateName}
                    onChange={(e) => setEstateName(e.target.value)}
                    placeholder="Blue Gardens Estate"
                    required
                  />
                </div>
              </label>

              {/* Resident Name */}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Your name</span>
                <div className="relative mt-2">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-600/20"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </label>

              {/* Phone Number */}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Phone number</span>
                <div className="relative mt-2">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-600/20"
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
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium uppercase tracking-wider text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal focus:border-blue-400 focus:ring-4 focus:ring-blue-600/20"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                    placeholder="BS-XX-2025"
                    required
                  />
                </div>
                <span className="mt-1.5 block text-xs text-slate-500">
                  Your estate admin provided this code during registration
                </span>
              </label>

              {/* Password */}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-14 text-base font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-600/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 touch-target"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
            </div>

            {/* Error display */}
            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 error-state">
                {error}
              </div>
            ) : null}

            {/* Desktop submit button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 hidden w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-60 sm:inline-flex btn-interactive"
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

            {/* Footer link - desktop */}
            <p className="mt-6 hidden text-center text-sm text-slate-600 sm:block">
              Are you an estate admin?{" "}
              <Link href="/auth/sign-in" className="font-semibold text-blue-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </form>
        </main>

        {/* Mobile bottom action bar */}
        <div className="bottom-action-bar sm:hidden">
          <button
            type="submit"
            form="resident-form"
            disabled={loading}
            onClick={onSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all disabled:opacity-60"
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
          <p className="mt-3 text-center text-sm text-slate-600">
            Estate admin?{" "}
            <Link href="/auth/sign-in" className="font-semibold text-blue-600">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Spacer for mobile bottom bar */}
        <div className="h-32 sm:hidden" />
      </div>
    </div>
  );
}
