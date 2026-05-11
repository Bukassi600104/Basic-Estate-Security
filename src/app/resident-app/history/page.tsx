"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  LogIn,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";

type Code = {
  id: string;
  type: "GUEST" | "STAFF";
  status: "ACTIVE" | "USED" | "REVOKED" | "EXPIRED";
  code: string;
  eventType: "ENTRY" | "EXIT";
  visitId?: string;
  guestCount: number;
  guestNames?: string;
  expiresAt: string;
  createdAt: string;
};

type DayGroup = {
  date: string;
  label: string;
  codes: Code[];
};

export default function ResidentHistoryPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resident/codes");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setCodes(data.codes ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dayGroups = useMemo(() => {
    const groups = new Map<string, Code[]>();
    for (const c of codes) {
      const d = c.createdAt.slice(0, 10);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(c);
    }
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const sorted: DayGroup[] = [];
    for (const [date, items] of [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
      let label: string;
      if (date === today) label = "Today";
      else if (date === yesterday) label = "Yesterday";
      else label = new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      sorted.push({ date, label, codes: items });
    }
    return sorted;
  }, [codes]);

  const totalUsed = useMemo(() => codes.filter((c) => c.status === "USED").length, [codes]);

  // Auto-expand today
  useEffect(() => {
    if (dayGroups.length > 0 && expandedDay === null) {
      setExpandedDay(dayGroups[0].date);
    }
  }, [dayGroups, expandedDay]);

  function statusColor(status: Code["status"]) {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-700";
      case "USED": return "bg-blue-100 text-blue-700";
      case "REVOKED": return "bg-slate-100 text-slate-600";
      case "EXPIRED": return "bg-rose-100 text-rose-600";
      default: return "bg-slate-100 text-slate-600";
    }
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">History</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? "Loading..." : `${codes.length} codes generated, ${totalUsed} used`}
        </p>
      </header>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <Calendar className="mx-auto h-14 w-14 text-slate-200" />
          <p className="mt-4 text-lg font-bold text-slate-700">No history yet</p>
          <p className="mt-1 text-sm text-slate-500">Generated codes will appear here</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {dayGroups.map((group) => {
            const expanded = expandedDay === group.date;
            return (
              <div key={group.date} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  onClick={() => setExpandedDay(expanded ? null : group.date)}
                  className="flex w-full items-center justify-between px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-900">{group.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                      {group.codes.length}
                    </span>
                  </div>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 px-5 py-3 space-y-3">
                    {group.codes.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {c.type === "GUEST" ? (
                            c.eventType === "ENTRY" ? (
                              <LogIn className="h-4 w-4 flex-shrink-0 text-green-500" />
                            ) : (
                              <LogOut className="h-4 w-4 flex-shrink-0 text-amber-500" />
                            )
                          ) : (
                            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-brand-green" />
                          )}
                          <div className="min-w-0">
                            <code className="font-mono text-sm font-bold tracking-wider text-slate-900">
                              {c.code}
                            </code>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                              <Clock className="h-3 w-3" />
                              {new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              {c.type === "GUEST" && (
                                <span className="uppercase">{c.eventType}</span>
                              )}
                              {c.guestCount > 1 && (
                                <span className="flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />
                                  {c.guestCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
