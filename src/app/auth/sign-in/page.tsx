"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Info, Lock, LogIn, Mail } from "lucide-react";
import { Spinner } from "@/components/Spinner";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Handle redirect from sign-up when account already exists
  useEffect(() => {
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    if (email) {
      setIdentifier(email);
    }
    if (message === "account_exists") {
      setInfoMessage("An account with this email already exists. Please sign in.");
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-in failed");

      if (data?.challenge === "SOFTWARE_TOKEN_MFA") {
        setMfaRequired(true);
        return;
      }

      if (data?.ok !== true) throw new Error(data.error ?? "Sign-in failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmMfa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, code: mfaCode, rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-blue-200/40 blur-[128px]" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-indigo-200/30 blur-[128px]" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
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
                <LogIn className="h-4 w-4" />
                Admin Portal
              </div>
            </div>

            <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your credentials to access the estate dashboard.
            </p>

            <form className="mt-8 grid gap-5" onSubmit={mfaRequired ? onConfirmMfa : onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    type="email"
                    autoComplete="username"
                    disabled={mfaRequired}
                    required
                  />
                </div>
              </label>

              {mfaRequired ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-slate-700">Authenticator code</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                </label>
              ) : (
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
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="font-semibold">Remember me</span>
                </label>
                <div className="text-xs font-semibold text-slate-500">
                  Use only on a private device.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                Never share your password. If you suspect compromise, change it immediately.
              </div>

              {infoMessage ? (
                <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {infoMessage}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Spinner className="text-white" />
                    {mfaRequired ? "Verifying…" : "Signing in…"}
                  </>
                ) : (
                  <>
                    {mfaRequired ? "Confirm code" : "Access dashboard"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-sm text-slate-600">
              New estate?{" "}
              <Link className="font-extrabold text-slate-900" href="/auth/sign-up">
                Create an account
              </Link>
            </div>
          </div>
        </div>

        <div className="relative hidden overflow-hidden border-l border-slate-200 bg-slate-900 lg:block">
          <div className="absolute inset-0 opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-slate-900 to-indigo-600/20" />
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
                System operational
              </div>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white">
                Secure your estate with intelligent control.
              </h2>
              <p className="mt-3 text-sm text-white/80">
                Manage residents, codes, and validations with a clean, real-time workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignInForm />
    </Suspense>
  );
}
