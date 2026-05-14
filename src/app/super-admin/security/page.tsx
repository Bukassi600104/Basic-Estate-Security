import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { listEstates } from "@/lib/repos/estates";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { OwnerMetricCard, OwnerPanel, ProgressBar, StatusPill, SuperAdminPageHero } from "@/app/super-admin/page-shell";

export default async function SuperAdminSecurityPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estates = await listEstates({ limit: 100 });
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const securityRows = await Promise.all(
    estates.map(async (estate) => {
      const logs = await listValidationLogsForEstate({ estateId: estate.estateId, limit: 500 });
      const failed = logs.filter((log) => log.outcome === "FAILURE");
      const recentFailed = failed.filter((log) => log.validatedAt >= since24h);
      const success = logs.length - failed.length;
      const failureReasons = failed.reduce<Record<string, number>>((acc, log) => {
        const key = log.failureReason || "Unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      return {
        id: estate.estateId,
        name: estate.name,
        total: logs.length,
        success,
        failed: failed.length,
        recentFailed: recentFailed.length,
        successRate: logs.length ? Math.round((success / logs.length) * 100) : 0,
        topFailure: Object.entries(failureReasons).sort((a, b) => b[1] - a[1])[0] ?? null,
      };
    }),
  );

  const totalChecks = securityRows.reduce((sum, estate) => sum + estate.total, 0);
  const totalFailed = securityRows.reduce((sum, estate) => sum + estate.failed, 0);
  const recentFailed = securityRows.reduce((sum, estate) => sum + estate.recentFailed, 0);
  const highRisk = securityRows.filter((estate) => estate.recentFailed >= 3 || (estate.total >= 10 && estate.successRate < 75));
  const totalSuccess = totalChecks - totalFailed;
  const platformSuccessRate = totalChecks ? Math.round((totalSuccess / totalChecks) * 100) : 0;

  const ranked = [...securityRows].sort((a, b) => b.recentFailed - a.recentFailed || b.failed - a.failed);

  return (
    <div className="space-y-6">
      <SuperAdminPageHero
        eyebrow="Security intelligence"
        title="Security"
        accent="Monitor"
        description="Track failed validations, unusual gate attempts, estates with risk signals, and overall access control success."
        icon={AlertTriangle}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerMetricCard label="Total Checks" value={totalChecks} detail="Recent sampled validations" tone="violet" />
        <OwnerMetricCard label="Success Rate" value={`${platformSuccessRate}%`} detail={`${totalSuccess} successful checks`} tone="emerald" />
        <OwnerMetricCard label="Failed Checks" value={totalFailed} detail="Invalid or denied attempts" tone="rose" />
        <OwnerMetricCard label="24h Failures" value={recentFailed} detail={`${highRisk.length} high-risk estates`} tone="amber" />
      </section>

      <OwnerPanel title="Estate Risk Table" description="Prioritized by recent failures, then total failed validation attempts.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="py-3 pr-4">Estate</th>
                <th className="py-3 pr-4">Risk</th>
                <th className="py-3 pr-4">Success Rate</th>
                <th className="py-3 pr-4">Failed</th>
                <th className="py-3 pr-4">Last 24h</th>
                <th className="py-3 pr-4">Top Failure Reason</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((estate) => {
                const riskTone = estate.recentFailed >= 3 || estate.successRate < 75 ? "rose" : estate.failed > 0 ? "amber" : "emerald";
                const riskLabel = riskTone === "rose" ? "High" : riskTone === "amber" ? "Watch" : "Normal";

                return (
                  <tr key={estate.id} className="border-b border-slate-50">
                    <td className="py-4 pr-4">
                      <Link href={`/super-admin/estates/${estate.id}`} className="font-black text-violet-700 hover:underline">
                        {estate.name}
                      </Link>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusPill tone={riskTone}>{riskLabel}</StatusPill>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="w-40">
                        <ProgressBar value={estate.successRate} tone={estate.successRate >= 90 ? "emerald" : estate.successRate >= 75 ? "amber" : "rose"} />
                        <p className="mt-1 text-xs font-bold text-slate-500">{estate.successRate}%</p>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">{estate.failed}</td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">{estate.recentFailed}</td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">
                      {estate.topFailure ? `${estate.topFailure[0]} (${estate.topFailure[1]})` : "None"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </OwnerPanel>

      <OwnerPanel title="High-Risk Follow Up">
        <div className="grid gap-3">
          {highRisk.map((estate) => (
            <div key={estate.id} className="flex items-center justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50 p-4">
              <div>
                <p className="font-black text-rose-950">{estate.name}</p>
                <p className="text-xs font-semibold text-rose-700">
                  {estate.recentFailed} failures in 24h · {estate.successRate}% success rate
                </p>
              </div>
              <Link href={`/super-admin/estates/${estate.id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-rose-700 shadow-sm">
                Review
              </Link>
            </div>
          ))}
          {highRisk.length === 0 ? <p className="text-sm font-semibold text-slate-500">No high-risk estates in the sampled data.</p> : null}
        </div>
      </OwnerPanel>
    </div>
  );
}
