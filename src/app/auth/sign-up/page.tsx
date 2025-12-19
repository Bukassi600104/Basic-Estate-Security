"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Lock, Mail, User, UserPlus } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [estateName, setEstateName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ estateName, adminName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-up failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
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

            <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
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
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500">Minimum 8 characters.</span>
              </label>

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
                {loading ? "Creating…" : "Create estate"}
                <ArrowRight className="h-4 w-4" />
              </button>
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
