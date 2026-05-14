import { Clock3 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listEstates } from "@/lib/repos/estates";
import {
  daysBetween,
  daysFromNow,
  OwnerMetricCard,
  OwnerPanel,
  ProgressBar,
  StatusPill,
  SuperAdminPageHero,
} from "@/app/super-admin/page-shell";

export default async function SuperAdminTrialsPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estates = await listEstates({ limit: 500 });
  const trialEstates = estates.filter((estate) => estate.subscriptionStatus === "TRIALING");
  const pilotTrials = trialEstates.filter((estate) => estate.trialType === "PILOT");
  const standardTrials = trialEstates.filter((estate) => estate.trialType !== "PILOT");
  const expiringSoon = trialEstates.filter((estate) => {
    const days = daysFromNow(estate.trialEndsAt);
    return days >= 0 && days <= 7;
  });
  const expired = estates.filter((estate) => estate.subscriptionStatus === "EXPIRED" || daysFromNow(estate.trialEndsAt) < 0);

  const rows = [...trialEstates].sort((a, b) => new Date(a.trialEndsAt).getTime() - new Date(b.trialEndsAt).getTime());

  return (
    <div className="space-y-6">
      <SuperAdminPageHero
        eyebrow="Trial control"
        title="Trial"
        accent="Monitor"
        description="Track standard 30-day trials, 90-day pilots, expiry risk, and conversion follow-up priorities."
        icon={Clock3}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OwnerMetricCard label="Active Trials" value={trialEstates.length} detail={`${standardTrials.length} standard trials`} tone="violet" />
        <OwnerMetricCard label="90-Day Pilots" value={pilotTrials.length} detail="Special test estates" tone="emerald" />
        <OwnerMetricCard label="Expiring Soon" value={expiringSoon.length} detail="Within 7 days" tone="amber" />
        <OwnerMetricCard label="Expired" value={expired.length} detail="Needs payment or extension" tone="rose" />
      </section>

      <OwnerPanel title="Trial Expiry Queue" description="Prioritized by nearest trial end date. Use this to know who needs conversion follow-up first.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="py-3 pr-4">Estate</th>
                <th className="py-3 pr-4">Trial Type</th>
                <th className="py-3 pr-4">Started</th>
                <th className="py-3 pr-4">Ends</th>
                <th className="py-3 pr-4">Countdown</th>
                <th className="py-3 pr-4">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((estate) => {
                const totalDays = estate.trialType === "PILOT" ? 90 : 30;
                const elapsed = daysBetween(estate.trialStartedAt, new Date().toISOString());
                const remaining = daysFromNow(estate.trialEndsAt);
                const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
                const tone = remaining < 0 ? "rose" : remaining <= 7 ? "amber" : estate.trialType === "PILOT" ? "emerald" : "violet";

                return (
                  <tr key={estate.estateId} className="border-b border-slate-50">
                    <td className="py-4 pr-4 font-black text-slate-950">{estate.name}</td>
                    <td className="py-4 pr-4">
                      <StatusPill tone={estate.trialType === "PILOT" ? "emerald" : "violet"}>
                        {estate.trialType === "PILOT" ? "90-day pilot" : "30-day standard"}
                      </StatusPill>
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">{new Date(estate.trialStartedAt).toLocaleDateString()}</td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">{new Date(estate.trialEndsAt).toLocaleDateString()}</td>
                    <td className="py-4 pr-4">
                      <StatusPill tone={tone}>{remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}</StatusPill>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="w-44">
                        <ProgressBar value={progress} tone={tone} />
                        <p className="mt-1 text-xs font-bold text-slate-500">{progress}% used</p>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={6}>No trial estates found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </OwnerPanel>
    </div>
  );
}
