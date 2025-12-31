"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, Lock, Mail, MapPin, User, UserPlus } from "lucide-react";
import { Spinner } from "@/components/Spinner";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [estateName, setEstateName] = useState("");
  const [estateAddress, setEstateAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estateName, estateAddress, adminName, email, password }),
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

  return (
    <div className="min-h-[100dvh] bg-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand-navy/10 blur-[128px]" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-brand-green/10 blur-[128px]" />
      </div>

      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="flex items-center px-6 py-10 lg:px-12 overflow-y-auto max-h-[100dvh]">
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              >
                Back to home
              </Link>
              <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 sm:flex">
                <UserPlus className="h-4 w-4" />
                Estate setup
              </div>
            </div>

            <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-slate-900">
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
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
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
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                        value={estateAddress}
                        onChange={(e) => setEstateAddress(e.target.value)}
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
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
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
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
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
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
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
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
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Spinner className="text-white" />
                          Creating…
                        </>
                      ) : (
                        <>
                          Create estate
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

        <div className="relative hidden overflow-hidden border-l border-slate-200 bg-slate-900 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/25 via-slate-900 to-indigo-600/15" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative flex h-full items-end p-12">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-white/90">
                Fast onboarding
              </div>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white">
                Onboard residents, issue codes, validate entries.
              </h2>
              <p className="mt-3 text-sm text-white/80">
                A simple workflow for admins, residents, and guards—fully logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
