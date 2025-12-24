import { requireSession } from "@/lib/auth/require-session";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { listActivityLogsForEstate } from "@/lib/repos/activity-logs";

export default async function EstateLogsPage() {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN" || !session.estateId) return null;

  const [validationsRaw, activityRaw] = await Promise.all([
    listValidationLogsForEstate({ estateId: session.estateId, limit: 50 }),
    listActivityLogsForEstate({ estateId: session.estateId, limit: 50 }),
  ]);

  const validations = validationsRaw.map((v) => ({
    id: v.logId,
    validatedAt: v.validatedAt,
    gateName: v.gateName,
    houseNumber: v.houseNumber,
    residentName: v.residentName,
    passType: v.passType,
    outcome: v.outcome,
    failureReason: v.failureReason,
    guardUser: { name: v.guardName, phone: v.guardPhone },
    codeValue: v.codeValue,
  }));

  const activity = activityRaw.map((a) => ({
    id: a.activityId,
    type: a.type,
    message: a.message,
    createdAt: a.createdAt,
  }));

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-slate-900">Validations</h2>
          <div className="flex items-center gap-3">
            <a
              href="/api/estate-admin/logs/export"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
            >
              Export CSV
            </a>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest 50</div>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-600">
          Latest validations recorded by guards.
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
              <thead className="text-slate-600">
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Time</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Gate</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">House</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Resident</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Type</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Outcome</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Reason</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Guard</th>
                  <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Code</th>
                </tr>
              </thead>
              <tbody>
                {validations.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-700">
                      {new Date(v.validatedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-slate-700">{v.gateName ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{v.houseNumber ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{v.residentName ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">{v.passType ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          v.outcome === "SUCCESS"
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800"
                            : "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-800"
                        }
                      >
                        {v.outcome}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-700">{v.failureReason ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-700">
                      {v.guardUser?.name ?? "—"}
                      {v.guardUser?.phone ? ` (${v.guardUser.phone})` : ""}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700">
                      {v.codeValue}
                    </td>
                  </tr>
                ))}
                {validations.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={9}>
                      No validations yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-slate-900">Activity</h2>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest 50
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {activity.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="text-sm text-slate-800">
                <span className="font-extrabold">{a.type}</span> — {a.message}
              </div>
              <div className="text-xs text-slate-600">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {activity.length === 0 ? (
            <div className="text-sm text-slate-600">No activity yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
