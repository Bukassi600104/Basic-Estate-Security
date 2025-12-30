"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
    <div className="min-h-screen bg-white">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-blue-200/40 blur-[128px]" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-indigo-200/30 blur-[128px]" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Form column */}
        <div className="flex items-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              >
                Back to home
              </Link>
              <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 sm:flex">
                <ShieldCheck className="h-4 w-4" />
                Security Guard Access
              </div>
            </div>

            <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-slate-900">
              Security Guard sign-in
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your estate details and verification code to access your security portal.
            </p>

            <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
              {/* Estate Name */}
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Estate name</span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={estateName}
                    onChange={(e) => setEstateName(e.target.value)}
                    placeholder="Blue Gardens Estate"
                    required
                  />
                </div>
              </label>

              {/* Guard Name */}
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Your name</span>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={guardName}
                    onChange={(e) => setGuardName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </label>

              {/* Phone Number */}
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Phone number</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+234..."
                    required
                  />
                </div>
              </label>

              {/* Verification Code */}
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Verification code</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium uppercase text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                    placeholder="BS-XX-2025"
                    required
                  />
                </div>
                <span className="text-xs text-slate-500">
                  Your estate admin provided this code when you were registered.
                </span>
              </label>

              {/* Password */}
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
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
              </label>

              {/* Error display */}
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  {error}
                </div>
              ) : null}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner className="text-white" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Are you an estate admin?{" "}
              <Link href="/auth/sign-in" className="font-semibold text-blue-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Right side decorative panel */}
        <div className="relative hidden overflow-hidden border-l border-slate-200 bg-slate-900 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative flex h-full flex-col items-center justify-center px-12 text-center">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <ShieldCheck className="h-12 w-12 text-white" />
            </div>
            <h2 className="mt-8 text-2xl font-extrabold text-white">
              Security Portal
            </h2>
            <p className="mt-4 max-w-sm text-sm text-slate-300">
              Validate visitor access codes and manage gate entries. Keep your estate secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
