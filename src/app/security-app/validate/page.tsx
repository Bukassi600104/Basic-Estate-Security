"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Home, Search, ShieldCheck, User, XCircle } from "lucide-react";
import { Spinner } from "@/components/Spinner";

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
  const [lookingUp, setLookingUp] = useState(false);
  const [success, setSuccess] = useState(false);

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
    setLookingUp(true);
    try {
      const res = await fetch("/api/guard/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(data.error ?? "Code not found");
      setLookup(data as LookupResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookingUp(false);
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
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setLookup(null);
        setCode("");
      }, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  function getStatusColor(status: string, expired: boolean) {
    if (expired) return "text-amber-600";
    switch (status) {
      case "ACTIVE":
        return "text-emerald-600";
      case "USED":
      case "REVOKED":
        return "text-slate-500";
      case "EXPIRED":
        return "text-amber-600";
      default:
        return "text-slate-600";
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-100/30 blur-3xl" />
      </div>

      {/* Success Overlay */}
      {success ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-500/95 success-state">
          <div className="text-center text-white">
            <CheckCircle2 className="mx-auto h-20 w-20" />
            <p className="mt-4 text-2xl font-bold">Access Granted</p>
            <p className="mt-2 text-emerald-100">Code validated successfully</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-6 pb-40">
        {/* Header */}
        <header className="page-enter">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Validate Code
              </h1>
              <p className="text-sm text-slate-600">Enter visitor access code</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mt-8 flex-1 page-enter">
          {/* Gate Selector */}
          <div className="relative">
            <label className="text-sm font-semibold text-slate-700">Select Gate</label>
            <div className="relative mt-2">
              <select
                value={gateId}
                onChange={(e) => setGateId(e.target.value)}
                className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-base font-medium text-slate-900 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-600/20"
                disabled={loading}
                required
              >
                {gates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Code Input - Large and Centered */}
          <div className="mt-6">
            <label className="text-sm font-semibold text-slate-700">Access Code</label>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
                setLookup(null);
              }}
              placeholder="000000"
              inputMode="numeric"
              pattern="[0-9]*"
              className="mt-2 h-20 w-full rounded-3xl border-2 border-slate-200 bg-white text-center text-4xl font-bold tracking-[0.3em] text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-600/20"
              maxLength={6}
              autoComplete="off"
            />
            <p className="mt-2 text-center text-sm text-slate-500">
              Enter the 6-digit code from the visitor
            </p>
          </div>

          {/* Error Message */}
          {error ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 error-state">
              <XCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
              <span className="text-sm font-medium text-rose-800">{error}</span>
            </div>
          ) : null}

          {/* Lookup Result Card */}
          {lookup ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-scale-in">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Code Preview</span>
              </div>
              <div className="p-4 space-y-3">
                {/* Resident Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{lookup.code.resident.name}</p>
                    <p className="text-sm text-slate-500">Resident</p>
                  </div>
                </div>

                {/* House Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{lookup.code.resident.houseNumber}</p>
                    <p className="text-sm text-slate-500">House Number</p>
                  </div>
                </div>

                {/* Code Details */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <span className="text-sm text-slate-500">Type</span>
                    <p className="font-semibold text-slate-900">{lookup.code.type}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-slate-500">Status</span>
                    <p className={`font-semibold ${getStatusColor(lookup.code.status, lookup.code.expired)}`}>
                      {lookup.code.status}
                      {lookup.code.expired ? " (Expired)" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        {/* Fixed Bottom Action Bar */}
        <div className="bottom-action-bar">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={doLookup}
              disabled={!canLookup || loading || lookingUp}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white text-base font-bold text-slate-900 transition-all hover:bg-slate-50 disabled:opacity-50 touch-target"
            >
              {lookingUp ? (
                <Spinner className="text-slate-900" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Lookup
            </button>
            <button
              type="button"
              onClick={validate}
              disabled={!canLookup || !gateId || validating || loading}
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:shadow-xl disabled:opacity-50 touch-target"
            >
              {validating ? (
                <>
                  <Spinner className="text-white" />
                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Validate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
