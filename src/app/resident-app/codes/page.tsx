"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Check,
  Copy,
  KeyRound,
  LogIn,
  LogOut,
  Minus,
  Plus,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { CountdownTimer } from "@/components/CountdownTimer";
import { FirstLoginPopup } from "@/components/first-login-popup";

type Code = {
  id: string;
  type: "GUEST" | "STAFF";
  status: "ACTIVE" | "USED" | "REVOKED" | "EXPIRED";
  code: string;
  eventType: "ENTRY" | "EXIT";
  visitId?: string;
  linkedCodeId?: string;
  guestCount: number;
  guestNames?: string;
  expiresAt: string;
  createdAt: string;
};

type CodePair = {
  visitId: string;
  entryCode: Code;
  exitCode: Code;
};

export default function ResidentAppCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [sheetType, setSheetType] = useState<"GUEST" | "STAFF">("GUEST");
  const [guestCount, setGuestCount] = useState(1);
  const [guestNames, setGuestNames] = useState("");
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [passwordPopupDismissed, setPasswordPopupDismissed] = useState(false);

  const codePairs = useMemo(() => {
    const pairs: CodePair[] = [];
    const seen = new Set<string>();
    for (const c of codes) {
      if (c.type === "GUEST" && c.visitId && !seen.has(c.visitId)) {
        seen.add(c.visitId);
        const entry = codes.find((x) => x.visitId === c.visitId && x.eventType === "ENTRY");
        const exit = codes.find((x) => x.visitId === c.visitId && x.eventType === "EXIT");
        if (entry && exit) {
          pairs.push({ visitId: c.visitId, entryCode: entry, exitCode: exit });
        }
      }
    }
    return pairs;
  }, [codes]);

  const staffCodes = useMemo(
    () => codes.filter((c) => c.type === "STAFF"),
    [codes],
  );

  const activePairCount = useMemo(
    () => codePairs.filter((p) => p.entryCode.status === "ACTIVE" && !isExpired(p.entryCode.expiresAt)).length,
    [codePairs],
  );

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void load();
    async function checkFirstLogin() {
      try {
        const res = await fetch("/api/resident/profile");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.profile && !data.profile.passwordChanged) {
          setShowPasswordPopup(true);
        }
      } catch {}
    }
    checkFirstLogin();
  }, [load]);

  async function createCode() {
    setError(null);
    setCreating(true);
    try {
      const body: Record<string, unknown> = { type: sheetType };
      if (sheetType === "GUEST") {
        body.guestCount = guestCount;
        if (guestNames.trim()) body.guestNames = guestNames.trim();
      }
      const res = await fetch("/api/resident/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create code");
      setShowSheet(false);
      setGuestCount(1);
      setGuestNames("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create code");
    } finally {
      setCreating(false);
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
    } catch {}
  }

  async function sharePair(pair: CodePair) {
    const text = `Guest Access Codes\n\nEntry Code: ${pair.entryCode.code}\nExit Code: ${pair.exitCode.code}${
      pair.entryCode.guestCount > 1 ? `\nGuests: ${pair.entryCode.guestCount}` : ""
    }\n\nPlease present the entry code at the gate on arrival and the exit code when leaving.`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopiedId(`share-${pair.visitId}`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  function openSheet(type: "GUEST" | "STAFF") {
    setSheetType(type);
    setGuestCount(1);
    setGuestNames("");
    setShowSheet(true);
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-5 py-6 text-slate-950">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Pass Codes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate &amp; manage access codes
          </p>
        </header>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* Quick stats */}
        {!loading && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Guests
              </p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-600">{activePairCount}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Staff Codes
              </p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-600">
                {staffCodes.filter((c) => c.status === "ACTIVE" && !isExpired(c.expiresAt)).length}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : (
          <>
            {/* Guest Code Pairs */}
            {codePairs.length > 0 && (
              <section className="mt-6">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <Users className="h-4 w-4" /> Guest Codes
                </h2>
                <div className="mt-3 space-y-4">
                  {codePairs.map((pair) => {
                    const active = pair.entryCode.status === "ACTIVE" && !isExpired(pair.entryCode.expiresAt);
                    return (
                      <div
                        key={pair.visitId}
                        className={`rounded-2xl border bg-white shadow-sm transition-all ${
                          active ? "border-emerald-200 shadow-emerald-100/60" : "border-violet-100"
                        }`}
                      >
                        {/* Header bar */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                          <div className="flex items-center gap-2">
                            {pair.entryCode.guestCount > 1 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                                <Users className="h-3 w-3" />
                                {pair.entryCode.guestCount} guests
                              </span>
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {active ? "ACTIVE" : pair.entryCode.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {active && (
                              <CountdownTimer expiresAt={pair.entryCode.expiresAt} size="sm" showLabel />
                            )}
                            <button
                              onClick={() => sharePair(pair)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700"
                            >
                              {copiedId === `share-${pair.visitId}` ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Share2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Code display */}
                        <div className="grid grid-cols-2 divide-x divide-slate-100">
                          <CodeCell
                            label="Entry"
                            code={pair.entryCode.code}
                            icon={<LogIn className="h-4 w-4" />}
                            color="green"
                            copied={copiedId === pair.entryCode.id}
                            onCopy={() => copyCode(pair.entryCode.code, pair.entryCode.id)}
                          />
                          <CodeCell
                            label="Exit"
                            code={pair.exitCode.code}
                            icon={<LogOut className="h-4 w-4" />}
                            color="amber"
                            copied={copiedId === pair.exitCode.id}
                            onCopy={() => copyCode(pair.exitCode.code, pair.exitCode.id)}
                          />
                        </div>

                        {pair.entryCode.guestNames && (
                          <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
                            {pair.entryCode.guestNames}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Staff Codes */}
            {staffCodes.length > 0 && (
              <section className="mt-6">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <ShieldCheck className="h-4 w-4" /> Staff Codes
                </h2>
                <div className="mt-3 space-y-3">
                  {staffCodes.map((c) => {
                    const active = c.status === "ACTIVE" && !isExpired(c.expiresAt);
                    return (
                      <div
                        key={c.id}
                        className={`rounded-2xl border bg-white p-4 shadow-sm ${
                          active ? "border-emerald-200" : "border-violet-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <code className="rounded-xl bg-violet-50 px-4 py-3 font-mono text-2xl font-extrabold tracking-[0.2em] text-slate-950 sm:text-3xl">
                              {c.code}
                            </code>
                            <button
                              onClick={() => copyCode(c.code, c.id)}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                                copiedId === c.id
                                  ? "border-green-300 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                              }`}
                            >
                              {copiedId === c.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                          {c.type === "STAFF" && active && (
                            <button
                              onClick={() => renew(c.id)}
                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                            >
                              <RefreshCcw className="h-3.5 w-3.5" />
                              Renew
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {active ? "ACTIVE" : c.status}
                          </span>
                          {active && (
                            <CountdownTimer expiresAt={c.expiresAt} size="sm" showLabel />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state */}
            {codePairs.length === 0 && staffCodes.length === 0 && (
              <div className="mt-10 rounded-2xl border border-dashed border-violet-200 bg-white px-6 py-14 text-center shadow-sm">
                <KeyRound className="mx-auto h-14 w-14 text-violet-200" />
                <p className="mt-4 text-lg font-bold text-slate-800">No codes yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Tap the + button below to generate your first access code
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowSheet(true)}
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-violet-700 text-white shadow-premium-lg transition-transform hover:bg-violet-800 active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Bottom Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !creating && setShowSheet(false)}
          />
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-slide-in-bottom overflow-y-auto rounded-t-3xl border border-violet-100 bg-white px-6 pb-8 pt-4 shadow-2xl safe-area-pb sm:rounded-3xl">
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950">Generate Code</h3>
              <button
                onClick={() => !creating && setShowSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-violet-50 hover:text-violet-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setSheetType("GUEST")}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  sheetType === "GUEST"
                    ? "border-violet-700 bg-violet-700/5"
                    : "border-slate-200 hover:border-violet-200"
                }`}
              >
                <Users className={`h-6 w-6 ${sheetType === "GUEST" ? "text-violet-700" : "text-slate-400"}`} />
                <p className="mt-2 font-bold text-slate-950">Guest</p>
                <p className="text-xs text-slate-500">Entry + exit pair, 6h</p>
              </button>
              <button
                onClick={() => setSheetType("STAFF")}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  sheetType === "STAFF"
                    ? "border-emerald-600 bg-emerald-600/5"
                    : "border-slate-200 hover:border-emerald-200"
                }`}
              >
                <ShieldCheck className={`h-6 w-6 ${sheetType === "STAFF" ? "text-emerald-600" : "text-slate-400"}`} />
                <p className="mt-2 font-bold text-slate-950">Staff</p>
                <p className="text-xs text-slate-500">Renewable, 6 months</p>
              </button>
            </div>

            {/* Guest-specific options */}
            {sheetType === "GUEST" && (
              <div className="mt-4 space-y-4">
                {/* Guest count stepper */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Number of Guests
                  </label>
                  <div className="mt-2 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      disabled={guestCount <= 1}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-violet-50 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-2xl font-extrabold text-slate-950">
                      {guestCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuestCount(Math.min(20, guestCount + 1))}
                      disabled={guestCount >= 20}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-violet-50 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Guest names (optional) */}
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Guest Names <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={guestNames}
                    onChange={(e) => setGuestNames(e.target.value)}
                    placeholder="e.g. John, Sarah"
                    maxLength={500}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none ring-violet-600/20 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4"
                  />
                </div>
              </div>
            )}

            <button
              onClick={createCode}
              disabled={creating}
              className={`mt-6 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                sheetType === "GUEST"
                  ? "bg-violet-700 hover:shadow-emerald-500/30"
                  : "bg-emerald-600 hover:bg-emerald-600/90"
              }`}
            >
              {creating ? (
                <>
                  <Spinner className="text-white" />
                  Generating...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Generate {sheetType === "GUEST" ? "Guest" : "Staff"} Code
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* First Login Popup */}
      {showPasswordPopup && !passwordPopupDismissed && (
        <FirstLoginPopup
          onClose={() => setPasswordPopupDismissed(true)}
          onSuccess={() => {
            setShowPasswordPopup(false);
            setPasswordPopupDismissed(true);
          }}
        />
      )}
    </>
  );
}

function CodeCell({
  label,
  code,
  icon,
  color,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  icon: React.ReactNode;
  color: "green" | "amber";
  copied: boolean;
  onCopy: () => void;
}) {
  const colors = color === "green"
    ? { badge: "bg-emerald-100 text-emerald-700" }
    : { badge: "bg-amber-100 text-amber-700" };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${colors.badge}`}>
          {icon}
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="font-mono text-2xl font-extrabold tracking-[0.15em] text-slate-950 sm:text-3xl">
          {code}
        </code>
        <button
          onClick={onCopy}
          className={`ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-all ${
            copied
              ? "border-green-300 bg-emerald-50 text-emerald-700"
              : "border-slate-200 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
