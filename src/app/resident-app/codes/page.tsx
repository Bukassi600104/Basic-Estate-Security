"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Copy, KeyRound, RefreshCcw, ShieldCheck, Users } from "lucide-react";
import { Spinner } from "@/components/Spinner";

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
        return "status-badge-active";
      case "USED":
      case "REVOKED":
        return "status-badge-used";
      case "EXPIRED":
        return "status-badge-expired";
      default:
        return "status-badge-used";
    }
  }

  function formatExpiry(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return "Expired";
    if (diffHours < 24) return `${diffHours}h left`;
    if (diffDays < 30) return `${diffDays}d left`;
    return d.toLocaleDateString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 page-enter">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pass Codes
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Generate access codes for guests and staff
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md touch-target"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        {/* Action Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 stagger-children">
          {/* Guest Pass Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm card-hover">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Guest Pass</h2>
                <p className="text-sm text-slate-500">Single-use, 6h expiry</p>
              </div>
            </div>
            <button
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl disabled:opacity-60 btn-interactive touch-target"
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
                  <KeyRound className="h-5 w-5" />
                  Generate Guest Code
                </>
              )}
            </button>
          </div>

          {/* Staff Pass Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm card-hover">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Staff Pass</h2>
                <p className="text-sm text-slate-500">Renewable, 6mo expiry</p>
              </div>
            </div>
            <button
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white text-base font-bold text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 touch-target"
              onClick={() => create("STAFF")}
              disabled={creating !== null}
            >
              {creating === "STAFF" ? (
                <>
                  <Spinner className="text-slate-900" />
                  Creating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Generate Staff Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 error-state">
            {error}
          </div>
        ) : null}

        {/* Active Guest Alert */}
        {activeGuest.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Active guest code</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Guest codes end immediately after validation
                </p>
              </div>
            </div>
          </div>
        ) : null}

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
                <div key={i} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
          ) : codes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-medium text-slate-600">No codes yet</p>
              <p className="mt-1 text-sm text-slate-500">Generate your first code above</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3 stagger-children">
              {codes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Code Display */}
                      <div className="flex items-center gap-3">
                        <span className="code-display text-xl sm:text-2xl">{c.code}</span>
                        <button
                          onClick={() => copyCode(c.code, c.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 touch-target"
                          aria-label="Copy code"
                        >
                          {copiedId === c.id ? (
                            <Check className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Meta Info */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`status-badge ${getStatusBadgeClass(c.status)}`}>
                          {c.status}
                        </span>
                        <span className="text-sm text-slate-500">
                          {c.type === "GUEST" ? "Guest" : "Staff"} · {formatExpiry(c.expiresAt)}
                        </span>
                      </div>
                    </div>

                    {/* Renew Button for Staff */}
                    {c.type === "STAFF" && c.status === "ACTIVE" ? (
                      <button
                        onClick={() => renew(c.id)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 touch-target"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Renew</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
