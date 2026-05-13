"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Home,
  LogIn,
  LogOut,
  Phone,
  Power,
  Search,
  ShieldCheck,
  Sun,
  Moon,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";

type ShiftInfo = {
  shiftId: string;
  gateName: string;
  shiftType: "DAY" | "NIGHT";
};

type LookupResult = {
  code: {
    id: string;
    code: string;
    type: string;
    status: string;
    eventType: string;
    guestCount: number;
    guestNames?: string;
    expiresAt: string;
    expired: boolean;
    resident: { name: string; houseNumber: string; status: string; phone?: string };
  };
};

type RecentValidation = {
  code: string;
  residentName: string;
  houseNumber: string;
  eventType: string;
  guestCount: number;
  outcome: "SUCCESS" | "FAILURE";
  time: string;
};

export default function SecurityValidatePage() {
  const router = useRouter();
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    eventType?: string;
    guestCount?: number;
    residentName?: string;
    houseNumber?: string;
  } | null>(null);
  const [recentValidations, setRecentValidations] = useState<RecentValidation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [endingShift, setEndingShift] = useState(false);

  const canLookup = useMemo(() => code.trim().length >= 3, [code]);

  useEffect(() => {
    async function loadShift() {
      setLoading(true);
      try {
        const res = await fetch("/api/guard/gates");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.shift) {
          setShiftInfo(data.shift);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    void loadShift();

    const saved = localStorage.getItem("recent_validations");
    if (saved) {
      try {
        setRecentValidations(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

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
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Validation failed");

      const eventType = data.eventType ?? lookup?.code?.eventType ?? "ENTRY";
      const guestCount = data.guestCount ?? lookup?.code?.guestCount ?? 1;

      addToHistory({
        code: code.trim(),
        residentName: data.residentName ?? lookup?.code.resident.name ?? "Unknown",
        houseNumber: data.houseNumber ?? lookup?.code.resident.houseNumber ?? "—",
        eventType,
        guestCount,
        outcome: "SUCCESS",
        time: new Date().toISOString(),
      });

      setResult({
        success: true,
        eventType,
        guestCount,
        residentName: data.residentName ?? lookup?.code.resident.name,
        houseNumber: data.houseNumber ?? lookup?.code.resident.houseNumber,
      });
      setTimeout(() => {
        setResult(null);
        setLookup(null);
        setCode("");
      }, 3000);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Validation failed";
      setError(errorMessage);

      addToHistory({
        code: code.trim(),
        residentName: lookup?.code.resident.name || "Unknown",
        houseNumber: lookup?.code.resident.houseNumber || "—",
        eventType: lookup?.code.eventType || "ENTRY",
        guestCount: lookup?.code.guestCount || 1,
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

  async function handleEndShift() {
    if (endingShift) return;
    setEndingShift(true);
    try {
      await fetch("/api/guard/end-shift", { method: "POST" });
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/");
    } catch {
      setEndingShift(false);
    }
  }

  function getStatusColor(status: string, expired: boolean) {
    if (expired) return "text-amber-600";
    switch (status) {
      case "ACTIVE":
        return "text-emerald-400";
      case "USED":
      case "REVOKED":
        return "text-white/50";
      case "EXPIRED":
        return "text-amber-600";
      default:
        return "text-white/60";
    }
  }

  function formatTime(iso: string) {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
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
                <p className="mt-6 text-3xl font-bold">
                  {result.eventType === "EXIT" ? "Exit Granted" : "Entry Granted"}
                </p>
                {result.residentName && (
                  <div className="mt-4 rounded-xl bg-white/20 p-4">
                    <p className="text-xl font-semibold">{result.residentName}</p>
                    <p className="text-lg opacity-90">House {result.houseNumber}</p>
                    {(result.guestCount ?? 1) > 1 && (
                      <p className="mt-2 text-lg font-bold">
                        <Users className="mr-2 inline h-5 w-5" />
                        {result.guestCount} Guests
                      </p>
                    )}
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
        {/* Header with Shift Badge */}
        <header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Validate Code
                </h1>
                <p className="text-sm text-white/60">Enter visitor access code</p>
              </div>
            </div>
            <button
              onClick={handleEndShift}
              disabled={endingShift}
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-white/5 px-3 py-2 text-sm font-semibold text-rose-400 transition-all hover:bg-rose-500/10"
            >
              <Power className="h-4 w-4" />
              <span className="hidden sm:inline">End Shift</span>
            </button>
          </div>

          {/* Shift Badge */}
          {shiftInfo && (
            <div className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${
              shiftInfo.shiftType === "DAY"
                ? "border-yellow-200 bg-yellow-50"
                : "border-indigo-200 bg-indigo-50"
            }`}>
              {shiftInfo.shiftType === "DAY" ? (
                <Sun className={`h-5 w-5 text-yellow-600`} />
              ) : (
                <Moon className={`h-5 w-5 text-indigo-600`} />
              )}
              <div>
                <p className={`text-sm font-bold ${
                  shiftInfo.shiftType === "DAY" ? "text-yellow-800" : "text-indigo-800"
                }`}>
                  {shiftInfo.gateName} — {shiftInfo.shiftType} Shift
                </p>
                <p className={`text-xs ${
                  shiftInfo.shiftType === "DAY" ? "text-yellow-600" : "text-indigo-600"
                }`}>
                  Gate locked for this session
                </p>
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="mt-6 flex-1 space-y-6">
          {/* Code Input */}
          <div>
            <label className="text-sm font-bold text-white/70">Access Code</label>
            <input
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                setCode(val);
                setError(null);
                setLookup(null);
              }}
              placeholder="00000000"
              inputMode="numeric"
              pattern="[0-9]*"
              className="mt-2 h-24 w-full rounded-2xl border-2 border-white/10 bg-white/5 text-center text-5xl font-bold tracking-[0.3em] text-white outline-none transition-all placeholder:text-slate-200 focus:border-brand-green focus:ring-4 focus:ring-brand-green/20"
              maxLength={8}
              autoComplete="off"
            />
            <p className="mt-2 text-center text-sm text-white/50">
              Enter the 8-digit code from the visitor
            </p>
          </div>

          {/* Error Message */}
          {error && !result && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
              <span className="text-sm font-medium text-rose-300">{error}</span>
            </div>
          )}

          {/* Lookup Result Card */}
          {lookup && (
            <div className="overflow-hidden rounded-2xl border-2 border-brand-green/30 bg-white/5 shadow-lg animate-in slide-in-from-bottom-4">
              <div className="border-b border-white/5 bg-brand-green/5 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-brand-green">Code Preview</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    lookup.code.eventType === "EXIT"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {lookup.code.eventType === "EXIT" ? (
                    <LogOut className="h-3 w-3" />
                  ) : (
                    <LogIn className="h-3 w-3" />
                  )}
                  {lookup.code.eventType || "ENTRY"}
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{lookup.code.resident.name}</p>
                    <p className="text-sm text-white/50">Resident</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                    <Home className="h-5 w-5 text-white/40" />
                    <div>
                      <p className="text-xs text-white/50">House</p>
                      <p className="font-bold text-white">{lookup.code.resident.houseNumber}</p>
                    </div>
                  </div>
                  {lookup.code.guestCount > 1 && (
                    <div className="flex items-center gap-3 rounded-xl bg-brand-green/10 p-3">
                      <Users className="h-5 w-5 text-brand-green" />
                      <div>
                        <p className="text-xs text-white/50">Guests</p>
                        <p className="font-bold text-brand-green">{lookup.code.guestCount}</p>
                      </div>
                    </div>
                  )}
                  {lookup.code.resident.phone && lookup.code.guestCount <= 1 && (
                    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                      <Phone className="h-5 w-5 text-white/40" />
                      <div>
                        <p className="text-xs text-white/50">Phone</p>
                        <p className="font-bold text-white text-sm">{lookup.code.resident.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {lookup.code.guestNames && (
                  <div className="rounded-xl bg-white/5 px-4 py-3">
                    <p className="text-xs text-white/50">Guest Names</p>
                    <p className="mt-1 text-sm font-medium text-white">{lookup.code.guestNames}</p>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <div>
                    <span className="text-xs text-white/50">Type</span>
                    <p className={`font-bold ${lookup.code.type === "GUEST" ? "text-brand-green" : "text-brand-green"}`}>
                      {lookup.code.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/50">Status</span>
                    <p className={`font-bold ${getStatusColor(lookup.code.status, lookup.code.expired)}`}>
                      {lookup.code.status}
                      {lookup.code.expired ? " (Expired)" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Validations */}
          {recentValidations.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-white/40" />
                  <span className="text-sm font-semibold text-white/70">Recent Validations</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/60">
                    {recentValidations.length}
                  </span>
                </div>
                {showHistory ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </button>

              {showHistory && (
                <div className="border-t border-white/5 divide-y divide-slate-50">
                  {recentValidations.map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            v.outcome === "SUCCESS" ? "bg-emerald-500/15" : "bg-rose-100"
                          }`}
                        >
                          {v.outcome === "SUCCESS" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{v.residentName}</p>
                          <p className="text-xs text-white/50">
                            {v.houseNumber} • {v.eventType} • {v.guestCount > 1 ? `${v.guestCount} guests` : "1 guest"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/40">
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
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-white/5 p-4 shadow-lg safe-area-pb">
          <div className="mx-auto max-w-lg flex gap-3">
            <button
              type="button"
              onClick={doLookup}
              disabled={!canLookup || loading || lookingUp}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/10 bg-white/5 text-base font-bold text-white transition-all hover:bg-white/5 disabled:opacity-50"
            >
              {lookingUp ? (
                <Spinner className="text-white" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Lookup
            </button>
            <button
              type="button"
              onClick={validate}
              disabled={!canLookup || validating || loading}
              className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-white shadow-lg transition-all hover:bg-brand-green/90 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Spinner className="text-white" />
                  Validating...
                </>
              ) : lookup?.code.eventType === "EXIT" ? (
                <>
                  <LogOut className="h-5 w-5" />
                  Validate & Allow Exit
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
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
