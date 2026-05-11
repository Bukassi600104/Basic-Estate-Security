"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  LogIn,
  LogOut,
  Search,
  X,
} from "lucide-react";

type LogEntry = {
  id: string;
  validatedAt: string;
  date: string;
  time: string;
  gateId: string;
  gateName: string;
  shiftType: string | null;
  eventType: string;
  visitId: string | null;
  guestCount: number;
  houseNumber: string | null;
  residentName: string | null;
  passType: string | null;
  outcome: string;
  failureReason: string | null;
  guardName: string | null;
  guardPhone: string | null;
  codeValue: string;
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  gateId: string;
  outcome: string;
  eventType: string;
  shiftType: string;
  houseNumber: string;
  passType: string;
};

const emptyFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  gateId: "",
  outcome: "",
  eventType: "",
  shiftType: "",
  houseNumber: "",
  passType: "",
};

function buildFilterParams(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", new Date(filters.dateFrom).toISOString());
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    params.set("dateTo", end.toISOString());
  }
  if (filters.gateId) params.set("gateId", filters.gateId);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.shiftType) params.set("shiftType", filters.shiftType);
  if (filters.houseNumber) params.set("houseNumber", filters.houseNumber);
  if (filters.passType) params.set("passType", filters.passType);
  return params.toString();
}

export default function EstateLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const qs = buildFilterParams(f);
      const res = await fetch(`/api/estate-admin/logs/filtered${qs ? `?${qs}` : ""}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs(filters);
  }, [fetchLogs, filters]);

  function applyFilters() {
    void fetchLogs(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const exportBase = buildFilterParams(filters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/estate-admin"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Validation Logs</h1>
            <p className="text-sm text-slate-600">
              {loading ? "Loading..." : `${total} records found`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              hasActiveFilters
                ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[10px] font-bold text-white">
                {Object.values(filters).filter((v) => v !== "").length}
              </span>
            )}
          </button>
          <a
            href={`/api/estate-admin/logs/export${exportBase ? `?${exportBase}` : ""}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            CSV
          </a>
          <a
            href={`/api/estate-admin/logs/export-excel${exportBase ? `?${exportBase}` : ""}`}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green/90"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Filter Results</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">Date From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">Date To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">Outcome</span>
              <select
                value={filters.outcome}
                onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">All</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">Event Type</span>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">All</option>
                <option value="ENTRY">Entry</option>
                <option value="EXIT">Exit</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">Shift</span>
              <select
                value={filters.shiftType}
                onChange={(e) => setFilters((f) => ({ ...f, shiftType: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">All</option>
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">Pass Type</span>
              <select
                value={filters.passType}
                onChange={(e) => setFilters((f) => ({ ...f, passType: e.target.value }))}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
              >
                <option value="">All</option>
                <option value="GUEST">Guest</option>
                <option value="STAFF">Staff</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-600">House Number</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. A-101"
                  value={filters.houseNumber}
                  onChange={(e) => setFilters((f) => ({ ...f, houseNumber: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                />
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Time</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Event</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Gate</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Shift</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">House</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Resident</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Guests</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Outcome</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Guard</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Code</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((v, idx) => (
                  <tr key={v.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.date}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">{v.time}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          v.eventType === "EXIT"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {v.eventType === "EXIT" ? (
                          <LogOut className="h-3 w-3" />
                        ) : (
                          <LogIn className="h-3 w-3" />
                        )}
                        {v.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{v.gateName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {v.shiftType ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            v.shiftType === "DAY"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {v.shiftType}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-semibold">{v.houseNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{v.residentName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {v.passType ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            v.passType === "GUEST"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {v.passType}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900">
                      {v.guestCount > 1 ? v.guestCount : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          v.outcome === "SUCCESS"
                            ? "bg-green-100 text-green-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {v.outcome === "SUCCESS" ? "✓" : "✕"} {v.outcome}
                      </span>
                      {v.failureReason && (
                        <p className="mt-1 text-xs text-rose-600">{v.failureReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{v.guardName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                        {v.codeValue}
                      </code>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                      <Download className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 font-medium">No validations found</p>
                      <p className="text-sm">
                        {hasActiveFilters
                          ? "Try adjusting your filters"
                          : "Validation logs will appear here when guards start validating codes"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
