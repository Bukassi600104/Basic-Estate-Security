"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Resident PWA</h1>
          <p className="mt-1 text-sm text-slate-600">
            Guest codes expire after 6 hours (and end immediately when validated). Domestic staff codes expire after 6 months and can be renewed.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
          onClick={() => load()}
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">New Guest Pass</div>
                <div className="mt-1 text-sm text-slate-600">Temporary single-use access for visitors.</div>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
              onClick={() => create("GUEST")}
            >
              Generate guest code
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">New Staff Pass</div>
                <div className="mt-1 text-sm text-slate-600">Recurring access for domestic staff.</div>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              onClick={() => create("STAFF")}
            >
              Generate staff code
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">{error}</div>
      ) : null}

      {activeGuest.length ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4" />
            <div>
              <div className="font-extrabold">Active guest code(s)</div>
              <div className="mt-1 text-amber-800">Guest codes end immediately after validation.</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-slate-900">Your codes</h2>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{loading ? "Loading" : `${codes.length} total`}</div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Code</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Type</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Status</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Expires</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : null}

              {!loading && codes.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={5}>
                    No codes yet.
                  </td>
                </tr>
              ) : null}

              {codes.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-mono text-xs font-extrabold text-slate-900">{c.code}</td>
                  <td className="py-3 pr-4 text-slate-700">{c.type}</td>
                  <td className="py-3 pr-4 text-slate-700">{c.status}</td>
                  <td className="py-3 pr-4 text-slate-700">{new Date(c.expiresAt).toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    {c.type === "STAFF" ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
                        onClick={() => renew(c.id)}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Renew
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
