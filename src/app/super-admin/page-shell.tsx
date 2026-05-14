import type { LucideIcon } from "lucide-react";

export function SuperAdminPageHero({
  eyebrow,
  title,
  accent,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <section className="relative overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-violet-700" />
      <div className="absolute right-8 top-8 h-36 w-36 rounded-full border-[24px] border-white/10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-normal">
            {title}
            <span className="block text-emerald-300">{accent}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/70">{description}</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/20 bg-white/10">
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </section>
  );
}

export function OwnerMetricCard({
  label,
  value,
  detail,
  tone = "violet",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "violet" | "emerald" | "amber" | "rose" | "slate";
}) {
  const colors = {
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-black ${colors}`}>{detail}</p>
    </div>
  );
}

export function OwnerPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function StatusPill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "emerald" | "amber" | "rose" | "violet" | "slate" }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${colors}`}>{children}</span>;
}

export function daysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

export function daysFromNow(endIso: string) {
  return Math.ceil((new Date(endIso).getTime() - Date.now()) / 86_400_000);
}

export function ProgressBar({ value, tone = "violet" }: { value: number; tone?: "violet" | "emerald" | "amber" | "rose" }) {
  const colors = {
    violet: "bg-violet-700",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }[tone];
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colors}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  );
}
