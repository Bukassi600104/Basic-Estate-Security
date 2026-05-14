import { CreditCard } from "lucide-react";
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

export default async function SuperAdminSubscriptionsPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estates = await listEstates({ limit: 500 });
  const active = estates.filter((estate) => estate.subscriptionStatus === "ACTIVE");
  const trialing = estates.filter((estate) => estate.subscriptionStatus === "TRIALING");
  const expired = estates.filter((estate) => estate.subscriptionStatus === "EXPIRED");
  const monthly = estates.filter((estate) => estate.billingCycle === "MONTHLY");
  const yearly = estates.filter((estate) => estate.billingCycle === "YEARLY");

  return (
    <div className="space-y-6">
      <SuperAdminPageHero
        eyebrow="Commercial health"
        title="Subscription"
        accent="Control"
        description="Monitor subscription status, billing cycles, plan tiers, trial duration, and expiry countdowns estate by estate."
        icon={CreditCard}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OwnerMetricCard label="Paid Active" value={active.length} detail="Converted estates" tone="emerald" />
        <OwnerMetricCard label="Trialing" value={trialing.length} detail="Still in evaluation" tone="violet" />
        <OwnerMetricCard label="Expired" value={expired.length} detail="Payment or extension needed" tone="rose" />
        <OwnerMetricCard label="Monthly" value={monthly.length} detail="Monthly billing cycle" tone="amber" />
        <OwnerMetricCard label="Yearly" value={yearly.length} detail="Annual billing cycle" tone="slate" />
      </section>

      <OwnerPanel title="Subscription Directory" description="Estate billing status, plan tier, trial or subscription duration, and expiry countdown.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="py-3 pr-4">Estate</th>
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Billing</th>
                <th className="py-3 pr-4">Duration</th>
                <th className="py-3 pr-4">Expiry Countdown</th>
                <th className="py-3 pr-4">Usage Window</th>
              </tr>
            </thead>
            <tbody>
              {estates.map((estate) => {
                const duration = estate.subscriptionStatus === "TRIALING"
                  ? `${estate.trialType === "PILOT" ? 90 : 30} days trial`
                  : estate.billingCycle === "YEARLY"
                    ? "12 months"
                    : "1 month";
                const countdown = daysFromNow(estate.trialEndsAt);
                const totalTrialDays = estate.trialType === "PILOT" ? 90 : 30;
                const elapsed = daysBetween(estate.trialStartedAt, new Date().toISOString());
                const progress = estate.subscriptionStatus === "TRIALING" ? Math.min(100, Math.round((elapsed / totalTrialDays) * 100)) : 100;
                const statusTone = estate.subscriptionStatus === "ACTIVE" ? "emerald" : estate.subscriptionStatus === "TRIALING" ? "violet" : "rose";
                const countdownTone = countdown < 0 ? "rose" : countdown <= 7 ? "amber" : "emerald";

                return (
                  <tr key={estate.estateId} className="border-b border-slate-50">
                    <td className="py-4 pr-4">
                      <div className="font-black text-slate-950">{estate.name}</div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">{estate.initials}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusPill tone="slate">{estate.subscriptionTier}</StatusPill>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusPill tone={statusTone}>{estate.subscriptionStatus}</StatusPill>
                    </td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">{estate.billingCycle}</td>
                    <td className="py-4 pr-4 font-semibold text-slate-600">{duration}</td>
                    <td className="py-4 pr-4">
                      <StatusPill tone={countdownTone}>{countdown < 0 ? `${Math.abs(countdown)}d overdue` : `${countdown}d left`}</StatusPill>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="w-44">
                        <ProgressBar value={progress} tone={countdownTone} />
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Ends {new Date(estate.trialEndsAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {estates.length === 0 ? (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={7}>No subscription records found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </OwnerPanel>
    </div>
  );
}
