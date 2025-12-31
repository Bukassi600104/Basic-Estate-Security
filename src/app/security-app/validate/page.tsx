"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Home,
  Phone,
  Search,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
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
    resident: { name: string; houseNumber: string; status: string; phone?: string };
  };
};

type RecentValidation = {
  code: string;
  residentName: string;
  houseNumber: string;
  outcome: "SUCCESS" | "FAILURE";
  time: string;
};

const GATE_STORAGE_KEY = "guard_selected_gate";

export default function SecurityValidatePage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [gateId, setGateId] = useState<string>("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: LookupResult } | null>(null);
  const [recentValidations, setRecentValidations] = useState<RecentValidation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const canLookup = useMemo(() => code.trim().length >= 3, [code]);

  // Load gates and restore saved gate selection
  async function loadGates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guard/gates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load gates");
      const list = (data.gates ?? []) as Gate[];
      setGates(list);

      // Restore saved gate or use first
      const savedGate = localStorage.getItem(GATE_STORAGE_KEY);
      if (savedGate && list.some((g) => g.id === savedGate)) {
        setGateId(savedGate);
      } else if (!gateId && list.length) {
        setGateId(list[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGates();
    // Load recent validations from localStorage
    const saved = localStorage.getItem("recent_validations");
    if (saved) {
      try {
        setRecentValidations(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save gate selection
  function handleGateChange(newGateId: string) {
    setGateId(newGateId);
    localStorage.setItem(GATE_STORAGE_KEY, newGateId);
  }

  // Add to recent validations
  function addToHistory(validation: RecentValidation) {
    const updated = [validation, ...recentValidations.slice(0, 9)];
    setRecentValidations(updated);
    localStorage.setItem("recent_validations", JSON.stringify(updated));
  }

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

      // Add to history
      if (lookup) {
        addToHistory({
          code: code.trim(),
          residentName: lookup.code.resident.name,
          houseNumber: lookup.code.resident.houseNumber,
          outcome: "SUCCESS",
          time: new Date().toISOString(),
        });
      }

      setResult({ success: true, data: lookup ?? undefined });
      setTimeout(() => {
        setResult(null);
        setLookup(null);
        setCode("");
      }, 3000);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Validation failed";
      setError(errorMessage);

      // Add failure to history
      addToHistory({
        code: code.trim(),
        residentName: lookup?.code.resident.name || "Unknown",
        houseNumber: lookup?.code.resident.houseNumber || "—",
        outcome: "FAILURE",
        time: new Date().toISOString(),
      });

      setResult({ success: false });
      setTimeout(() => {
        setResult(null);
      }, 3000);
    } finally {
      setValidating(false);
    }
  }

  function getStatusColor(status: string, expired: boolean) {
    if (expired) return "text-amber-600";
    switch (status) {
      case "ACTIVE":
        return "text-green-600";
      case "USED":
      case "REVOKED":
        return "text-slate-500";
      case "EXPIRED":
        return "text-amber-600";
      default:
        return "text-slate-600";
    }
  }

  function formatTime(iso: string) {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-green/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-navy/5 blur-3xl" />
      </div>

      {/* Result Overlay */}
      {result && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${
            result.success ? "bg-green-600" : "bg-rose-600"
          }`}
        >
          <div className="text-center text-white">
            {result.success ? (
              <>
                <CheckCircle2 className="mx-auto h-24 w-24 animate-bounce" />
                <p className="mt-6 text-3xl font-bold">Access Granted</p>
                {result.data && (
                  <div className="mt-4 rounded-xl bg-white/20 p-4">
                    <p className="text-xl font-semibold">{result.data.code.resident.name}</p>
                    <p className="text-lg opacity-90">House {result.data.code.resident.houseNumber}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-24 w-24" />
                <p className="mt-6 text-3xl font-bold">Access Denied</p>
                <p className="mt-2 text-lg opacity-90">{error || "Validation failed"}</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-[100dvh] max-h-[100dvh] max-w-lg flex-col px-5 py-6 pb-48 overflow-y-auto">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Validate Code
              </h1>
              <p className="text-sm text-slate-600">Enter visitor access code</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mt-6 flex-1 space-y-6">
          {/* Gate Selector */}
          <div>
            <label className="text-sm font-bold text-slate-700">Select Gate</label>
            <div className="relative mt-2">
              <select
                value={gateId}
                onChange={(e) => handleGateChange(e.target.value)}
                className="h-14 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-12 text-base font-medium text-slate-900 outline-none transition-all focus:border-brand-green focus:ring-4 focus:ring-brand-green/20"
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

          {/* Code Input - Extra Large */}
          <div>
            <label className="text-sm font-bold text-slate-700">Access Code</label>
            <input
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(val);
                setError(null);
                setLookup(null);
              }}
              placeholder="000000"
              inputMode="numeric"
              pattern="[0-9]*"
              className="mt-2 h-24 w-full rounded-2xl border-2 border-slate-200 bg-white text-center text-5xl font-bold tracking-[0.4em] text-slate-900 outline-none transition-all placeholder:text-slate-200 focus:border-brand-green focus:ring-4 focus:ring-brand-green/20"
              maxLength={6}
              autoComplete="off"
            />
            <p className="mt-2 text-center text-sm text-slate-500">
              Enter the 6-digit code from the visitor
            </p>
          </div>

          {/* Error Message */}
          {error && !result && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
              <span className="text-sm font-medium text-rose-800">{error}</span>
            </div>
          )}

          {/* Lookup Result Card */}
          {lookup && (
            <div className="overflow-hidden rounded-2xl border-2 border-brand-green/30 bg-white shadow-lg animate-in slide-in-from-bottom-4">
              <div className="border-b border-slate-100 bg-brand-green/5 px-4 py-3">
                <span className="text-sm font-bold text-brand-navy">Code Preview</span>
              </div>
              <div className="p-4 space-y-4">
                {/* Resident Info */}
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{lookup.code.resident.name}</p>
                    <p className="text-sm text-slate-500">Resident</p>
                  </div>
                </div>

                {/* House & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <Home className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">House</p>
                      <p className="font-bold text-slate-900">{lookup.code.resident.houseNumber}</p>
                    </div>
                  </div>
                  {lookup.code.resident.phone && (
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <Phone className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="font-bold text-slate-900 text-sm">{lookup.code.resident.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Code Details */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <span className="text-xs text-slate-500">Type</span>
                    <p className={`font-bold ${lookup.code.type === "GUEST" ? "text-brand-navy" : "text-brand-green"}`}>
                      {lookup.code.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Status</span>
                    <p className={`font-bold ${getStatusColor(lookup.code.status, lookup.code.expired)}`}>
                      {lookup.code.status}
                      {lookup.code.expired ? " (Expired)" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Validations History */}
          {recentValidations.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Recent Validations</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                    {recentValidations.length}
                  </span>
                </div>
                {showHistory ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {showHistory && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {recentValidations.map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            v.outcome === "SUCCESS" ? "bg-green-100" : "bg-rose-100"
                          }`}
                        >
                          {v.outcome === "SUCCESS" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{v.residentName}</p>
                          <p className="text-xs text-slate-500">
                            {v.houseNumber} • Code: {v.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTime(v.time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 shadow-lg safe-area-pb">
          <div className="mx-auto max-w-lg flex gap-3">
            <button
              type="button"
              onClick={doLookup}
              disabled={!canLookup || loading || lookingUp}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-base font-bold text-slate-900 transition-all hover:bg-slate-50 disabled:opacity-50"
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
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-white shadow-lg transition-all hover:bg-brand-green/90 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Spinner className="text-white" />
                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Validate & Allow Entry
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
