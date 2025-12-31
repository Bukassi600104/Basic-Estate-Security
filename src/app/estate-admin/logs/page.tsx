import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, FileText } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { listActivityLogsForEstate } from "@/lib/repos/activity-logs";

export default async function EstateLogsPage() {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN" || !session.estateId) return null;

  const [validationsRaw, activityRaw] = await Promise.all([
    listValidationLogsForEstate({ estateId: session.estateId, limit: 100 }),
    listActivityLogsForEstate({ estateId: session.estateId, limit: 50 }),
  ]);

  const validations = validationsRaw.map((v) => {
    const dt = new Date(v.validatedAt);
    return {
      id: v.logId,
      validatedAt: v.validatedAt,
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      gateName: v.gateName,
      houseNumber: v.houseNumber,
      residentName: v.residentName,
      passType: v.passType,
      outcome: v.outcome,
      failureReason: v.failureReason,
      guardName: v.guardName,
      guardPhone: v.guardPhone,
      codeValue: v.codeValue,
    };
  });

  const activity = activityRaw.map((a) => ({
    id: a.activityId,
    type: a.type,
    message: a.message,
    createdAt: a.createdAt,
  }));

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
              {validations.length} records found
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/estate-admin/logs/export"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            Export CSV
          </a>
          <a
            href="/api/estate-admin/logs/export-excel"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green/90"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </a>
        </div>
      </div>

      {/* Validations Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Time
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Gate
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  House
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Resident
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Outcome
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Guard
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Guard Phone
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Code
                </th>
              </tr>
            </thead>
            <tbody>
              {validations.map((v, idx) => (
                <tr
                  key={v.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                >
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {v.date}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                    {v.time}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{v.gateName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-900 font-semibold">
                    {v.houseNumber ?? "—"}
                  </td>
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
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {v.guardPhone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {v.codeValue}
                    </code>
                  </td>
                </tr>
              ))}
              {validations.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <Download className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 font-medium">No validations yet</p>
                    <p className="text-sm">
                      Validation logs will appear here when guards start validating codes
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Activity Log</h2>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Latest {activity.length}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {activity.map((a) => {
            const dt = new Date(a.createdAt);
            return (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-navy/10">
                  <span className="text-xs font-bold text-brand-navy">
                    {a.type.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{a.type}</span>
                    {" — "}
                    {a.message}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          {activity.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
