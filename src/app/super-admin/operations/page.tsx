import { DoorOpen } from "lucide-react";
import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { listEstates } from "@/lib/repos/estates";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { listUsersForEstate } from "@/lib/repos/users";
import { OwnerMetricCard, OwnerPanel, ProgressBar, StatusPill, SuperAdminPageHero } from "@/app/super-admin/page-shell";

export default async function SuperAdminOperationsPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estates = await listEstates({ limit: 100 });
  const estateSummaries = await Promise.all(
    estates.map(async (estate) => {
      const [users, validations] = await Promise.all([
        listUsersForEstate({ estateId: estate.estateId, limit: 500 }),
        listValidationLogsForEstate({ estateId: estate.estateId, limit: 500 }),
      ]);
      const residents = users.filter((user) => user.role === "RESIDENT" || user.role === "RESIDENT_DELEGATE").length;
      const guards = users.filter((user) => user.role === "GUARD").length;
      const admins = users.filter((user) => user.role === "ESTATE_ADMIN" || user.role === "SUB_ADMIN").length;
      const success = validations.filter((log) => log.outcome === "SUCCESS").length;
      const failed = validations.length - success;
      const lastActivity = validations[0]?.validatedAt ?? null;
      const setupScore = (residents > 0 ? 35 : 0) + (guards > 0 ? 25 : 0) + (admins > 0 ? 20 : 0) + (validations.length > 0 ? 20 : 0);

      return {
        id: estate.estateId,
        name: estate.name,
        status: estate.status,
        residents,
        guards,
        admins,
        validations: validations.length,
        success,
        failed,
        lastActivity,
        setupScore,
      };
    }),
  );

  const totalValidations = estateSummaries.reduce((sum, estate) => sum + estate.validations, 0);
  const totalResidents = estateSummaries.reduce((sum, estate) => sum + estate.residents, 0);
  const totalGuards = estateSummaries.reduce((sum, estate) => sum + estate.guards, 0);
  const quietEstates = estateSummaries.filter((estate) => estate.validations === 0);
  const incompleteSetup = estateSummaries.filter((estate) => estate.setupScore < 80);
  const topEstates = [...estateSummaries].sort((a, b) => b.validations - a.validations).slice(0, 10);

  return (
    <div className="space-y-6">
      <SuperAdminPageHero
        eyebrow="Estate operations"
        title="Operations"
        accent="Monitor"
        description="See which estates are active, which ones are quiet, and whether residents, guards, admins, and validations are actually operating."
        icon={DoorOpen}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerMetricCard label="Validations" value={totalValidations} detail="Recent sampled gate checks" tone="violet" />
        <OwnerMetricCard label="Residents" value={totalResidents} detail="Resident and delegate users" tone="emerald" />
        <OwnerMetricCard label="Guards" value={totalGuards} detail="Registered security users" tone="slate" />
        <OwnerMetricCard label="Quiet Estates" value={quietEstates.length} detail="No recent validation logs" tone="amber" />
      </section>

      <OwnerPanel title="Operational Health by Estate" description="This shows whether each estate has the minimum operating structure and actual gate activity.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="py-3 pr-4">Estate</th>
                <th className="py-3 pr-4">Setup Health</th>
                <th className="py-3 pr-4">Residents</th>
                <th className="py-3 pr-4">Guards</th>
                <th className="py-3 pr-4">Admins</th>
                <th className="py-3 pr-4">Validations</th>
                <th className="py-3 pr-4">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {estateSummaries.map((estate) => (
                <tr key={estate.id} className="border-b border-slate-50">
                  <td className="py-4 pr-4">
                    <Link href={`/super-admin/estates/${estate.id}`} className="font-black text-violet-700 hover:underline">
                      {estate.name}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="w-44">
                      <ProgressBar value={estate.setupScore} tone={estate.setupScore >= 80 ? "emerald" : estate.setupScore >= 50 ? "amber" : "rose"} />
                      <p className="mt-1 text-xs font-bold text-slate-500">{estate.setupScore}% configured</p>
                    </div>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-600">{estate.residents}</td>
                  <td className="py-4 pr-4 font-semibold text-slate-600">{estate.guards}</td>
                  <td className="py-4 pr-4 font-semibold text-slate-600">{estate.admins}</td>
                  <td className="py-4 pr-4">
                    <StatusPill tone={estate.validations > 0 ? "emerald" : "amber"}>{estate.validations}</StatusPill>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-600">
                    {estate.lastActivity ? new Date(estate.lastActivity).toLocaleString() : "No activity"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OwnerPanel>

      <section className="grid gap-6 xl:grid-cols-2">
        <OwnerPanel title="Most Active Estates">
          <div className="space-y-3">
            {topEstates.map((estate) => (
              <div key={estate.id}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-black text-slate-800">{estate.name}</span>
                  <span className="font-black text-slate-950">{estate.validations}</span>
                </div>
                <ProgressBar value={topEstates[0]?.validations ? (estate.validations / topEstates[0].validations) * 100 : 0} />
              </div>
            ))}
          </div>
        </OwnerPanel>

        <OwnerPanel title="Needs Setup Attention">
          <div className="space-y-3">
            {incompleteSetup.slice(0, 8).map((estate) => (
              <div key={estate.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div>
                  <p className="font-black text-slate-950">{estate.name}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Residents {estate.residents} · Guards {estate.guards} · Validations {estate.validations}
                  </p>
                </div>
                <StatusPill tone={estate.setupScore >= 50 ? "amber" : "rose"}>{estate.setupScore}%</StatusPill>
              </div>
            ))}
            {incompleteSetup.length === 0 ? <p className="text-sm font-semibold text-slate-500">All sampled estates have a healthy setup.</p> : null}
          </div>
        </OwnerPanel>
      </section>
    </div>
  );
}
