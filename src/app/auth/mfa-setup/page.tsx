"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function MfaSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/totp/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Unable to start MFA setup");
      setSecretCode(String(data.secretCode ?? ""));
      setOtpauthUrl(String(data.otpauthUrl ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start MFA setup");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/totp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Pre-start on first load to reduce friction.
    start().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
          >
            Back to home
          </Link>
          <div className="text-sm font-semibold text-slate-500">MFA Setup</div>
        </div>

        <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-slate-900">
          Set up your authenticator app
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          To continue, add a TOTP code (Google Authenticator, Microsoft Authenticator, etc.).
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-bold text-slate-900">Step 1 — Add secret</div>
          <p className="mt-2 text-sm text-slate-600">
            If your app supports QR import, open this link. Otherwise copy the secret.
          </p>

          <div className="mt-4 grid gap-3">
            {otpauthUrl ? (
              <a
                className="break-all rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                href={otpauthUrl}
              >
                {otpauthUrl}
              </a>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Generating setup link…
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-bold text-slate-600">Secret</div>
              <div className="mt-1 break-all font-mono text-sm text-slate-900">
                {secretCode ?? "…"}
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={start}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-extrabold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Regenerate
            </button>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={verify}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-bold text-slate-900">Step 2 — Verify code</div>
            <p className="mt-2 text-sm text-slate-600">
              Enter the 6-digit code from your authenticator app.
            </p>

            <input
              className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Finish setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
