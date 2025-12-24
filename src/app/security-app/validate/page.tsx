"use client";

import { useEffect, useMemo, useState } from "react";

type Gate = { id: string; name: string };

type LookupResult = {
  code: {
    id: string;
    code: string;
    type: string;
    status: string;
    expiresAt: string;
    expired: boolean;
    resident: { name: string; houseNumber: string; status: string };
  };
};

export default function SecurityValidatePage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [gateId, setGateId] = useState<string>("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [validating, setValidating] = useState(false);

  const canLookup = useMemo(() => code.trim().length >= 3, [code]);

  async function loadGates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guard/gates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load gates");
      const list = (data.gates ?? []) as Gate[];
      setGates(list);
      if (!gateId && list.length) setGateId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLookup() {
    setError(null);
    setLookup(null);
    try {
      const res = await fetch("/api/guard/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setLookup(data as LookupResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    }
  }

  async function validate() {
    setError(null);
    setValidating(true);
    try {
      const res = await fetch("/api/guard/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim(), gateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Validation failed");
      setLookup(null);
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="grid gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Security PWA</h1>
          <p className="text-sm text-slate-600">Enter an access code, select the gate, and validate. Every attempt is logged (including failures).</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Gate</span>
            <select
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
              disabled={loading}
              required
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
              required
              minLength={3}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doLookup}
              disabled={!canLookup || loading}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Lookup
            </button>
            <button
              type="button"
              onClick={validate}
              disabled={!canLookup || !gateId || validating || loading}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {validating ? "Validating…" : "Validate"}
            </button>
          </div>

          {lookup ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="font-extrabold text-slate-900">Preview</div>
              <div className="mt-2 text-slate-700">
                <div>
                  <span className="font-semibold">Resident:</span> {lookup.code.resident.name}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">House:</span> {lookup.code.resident.houseNumber}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Type:</span> {lookup.code.type}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Status:</span> {lookup.code.status}{" "}
                  {lookup.code.expired ? "(expired)" : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
