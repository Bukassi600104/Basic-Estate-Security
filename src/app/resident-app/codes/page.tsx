"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock3, Copy, KeyRound, RefreshCcw, Settings, ShieldCheck, Users } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { CountdownTimer } from "@/components/CountdownTimer";
import { FirstLoginPopup } from "@/components/first-login-popup";

type Code = {
  id: string;
  type: "GUEST" | "STAFF";
  status: "ACTIVE" | "USED" | "REVOKED" | "EXPIRED";
  code: string;
  expiresAt: string;
  createdAt: string;
};

export default function ResidentAppCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<"GUEST" | "STAFF" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [passwordPopupDismissed, setPasswordPopupDismissed] = useState(false);

  const activeGuest = useMemo(
    () => codes.filter((c) => c.type === "GUEST" && c.status === "ACTIVE"),
    [codes],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resident/codes");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load codes");
      setCodes(data.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load codes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Check if first login (password not changed)
    async function checkFirstLogin() {
      try {
        const res = await fetch("/api/resident/profile");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.profile && !data.profile.passwordChanged) {
          setShowPasswordPopup(true);
        }
      } catch {
        // Ignore errors - non-critical
      }
    }
    checkFirstLogin();
  }, []);

  async function create(type: "GUEST" | "STAFF") {
    setError(null);
    setCreating(type);
    try {
      const res = await fetch("/api/resident/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create code");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setCreating(null);
    }
  }

  async function renew(codeId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/resident/codes/${codeId}/renew`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to renew code");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to renew code");
    }
  }

  async function copyCode(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  function getStatusBadgeClass(status: Code["status"]) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "USED":
        return "bg-blue-100 text-blue-700";
      case "REVOKED":
        return "bg-slate-100 text-slate-700";
      case "EXPIRED":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= new Date().getTime();
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white pb-8 overflow-x-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-navy/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-green/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pass Codes
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Generate access codes for guests and staff
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/resident-app/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              onClick={() => load()}
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Action Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Guest Pass Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Guest Pass</h2>
                <p className="text-sm text-slate-500">Single-use, 6h expiry</p>
              </div>
            </div>
            <button
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-navy/90 disabled:opacity-60"
              onClick={() => create("GUEST")}
              disabled={creating !== null}
            >
              {creating === "GUEST" ? (
                <>
                  <Spinner className="text-white" />
                  Creating...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Generate Guest Code
                </>
              )}
            </button>
          </div>

          {/* Staff Pass Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green text-white shadow-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Staff Pass</h2>
                <p className="text-sm text-slate-500">Renewable, 6mo expiry</p>
              </div>
            </div>
            <button
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-green bg-white text-sm font-bold text-brand-green transition-all hover:bg-brand-green/5 disabled:opacity-60"
              onClick={() => create("STAFF")}
              disabled={creating !== null}
            >
              {creating === "STAFF" ? (
                <>
                  <Spinner className="text-brand-green" />
                  Creating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Generate Staff Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        {/* Active Guest Alert */}
        {activeGuest.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Active guest code</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Guest codes expire immediately after validation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Codes List */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Your Codes</h2>
            <span className="text-sm text-slate-500">
              {loading ? "Loading..." : `${codes.length} total`}
            </span>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : codes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <KeyRound className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-600">No codes yet</p>
              <p className="mt-1 text-sm text-slate-500">Generate your first code above</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {codes.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                    c.status === "ACTIVE" && !isExpired(c.expiresAt)
                      ? "border-brand-green/30"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Countdown Timer for Active Codes */}
                    {c.status === "ACTIVE" && !isExpired(c.expiresAt) && (
                      <div className="hidden sm:block">
                        <CountdownTimer
                          expiresAt={c.expiresAt}
                          size={c.type === "GUEST" ? "md" : "sm"}
                          showLabel={false}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Code Display */}
                      <div className="flex items-center gap-3">
                        <code className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xl font-bold tracking-wider text-slate-900 sm:text-2xl">
                          {c.code}
                        </code>
                        <button
                          onClick={() => copyCode(c.code, c.id)}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                            copiedId === c.id
                              ? "border-green-300 bg-green-50 text-green-600"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          }`}
                          aria-label="Copy code"
                        >
                          {copiedId === c.id ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Status and Meta */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
                            c.status
                          )}`}
                        >
                          {c.status}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                            c.type === "GUEST"
                              ? "bg-brand-navy/10 text-brand-navy"
                              : "bg-brand-green/10 text-brand-green"
                          }`}
                        >
                          {c.type}
                        </span>

                        {/* Mobile Countdown */}
                        {c.status === "ACTIVE" && !isExpired(c.expiresAt) && (
                          <span className="text-sm text-slate-500 sm:hidden">
                            <CountdownTimer
                              expiresAt={c.expiresAt}
                              size="sm"
                              showLabel={true}
                            />
                          </span>
                        )}

                        {/* Show expired text if expired */}
                        {(c.status !== "ACTIVE" || isExpired(c.expiresAt)) && (
                          <span className="text-sm text-slate-500">
                            {c.status === "USED"
                              ? "Used"
                              : c.status === "EXPIRED" || isExpired(c.expiresAt)
                              ? "Expired"
                              : c.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Renew Button for Staff */}
                    {c.type === "STAFF" && c.status === "ACTIVE" && (
                      <button
                        onClick={() => renew(c.id)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Renew</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* First Login Password Change Popup */}
      {showPasswordPopup && !passwordPopupDismissed && (
        <FirstLoginPopup
          onClose={() => setPasswordPopupDismissed(true)}
          onSuccess={() => {
            setShowPasswordPopup(false);
            setPasswordPopupDismissed(true);
          }}
        />
      )}
    </div>
  );
}
