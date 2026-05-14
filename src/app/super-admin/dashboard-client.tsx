"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DoorOpen,
  Gauge,
  KeyRound,
  PieChart as PieChartIcon,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EstateRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
};

type Stats = {
  totalEstates: number;
  activeEstates: number;
  suspendedEstates: number;
  totalUsers: number;
  totalResidents: number;
  totalGuards: number;
  totalAdmins: number;
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  todayValidations: number;
  weekValidations: number;
  monthValidations: number;
  successRate: number;
  trialingEstates: number;
  paidEstates: number;
  expiredTrials: number;
  pilotTrials: number;
  trialsExpiringSoon: number;
  inactiveEstates: number;
  estatesWithNoUsers: number;
  estatesWithNoValidations: number;
};

type DailyValidation = {
  date: string;
  success: number;
  failed: number;
};

type ChartSlice = {
  name: string;
  value: number;
};

type EstatePerformance = {
  id: string;
  name: string;
  validations: number;
  success: number;
  failed: number;
  users: number;
  residents: number;
  guards: number;
  healthScore: number;
  lastActivityAt: string | null;
};

type AnalyticsCharts = {
  dailyValidations: DailyValidation[];
  roleDistribution: ChartSlice[];
  estateStatus: ChartSlice[];
  subscriptionStatus: ChartSlice[];
  trialType: ChartSlice[];
  validationOutcomes: ChartSlice[];
  passTypes: ChartSlice[];
  failureReasons: ChartSlice[];
  gateActivity: ChartSlice[];
  topEstatesByValidations: EstatePerformance[];
  estateHealth: EstatePerformance[];
};

type Alert = {
  id: string;
  type: "error" | "warning" | "success" | "info";
  message: string;
  timestamp: string;
  estateId?: string;
  estateName?: string;
};

const COLORS = ["#6d28d9", "#10b981", "#f59e0b", "#ef4444", "#2563eb", "#0f172a"];
const STATUS_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export function SuperAdminDashboardClient({
  initialEstates,
}: {
  initialEstates: EstateRow[];
  initialNextCursor: string | null;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<AnalyticsCharts>({
    dailyValidations: [],
    roleDistribution: [],
    estateStatus: [],
    subscriptionStatus: [],
    trialType: [],
    validationOutcomes: [],
    passTypes: [],
    failureReasons: [],
    gateActivity: [],
    topEstatesByValidations: [],
    estateHealth: [],
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [estates] = useState<EstateRow[]>(initialEstates);

  useEffect(() => {
    async function fetchData() {
      try {
        const [analyticsRes, alertsRes] = await Promise.all([
          fetch("/api/super-admin/analytics"),
          fetch("/api/super-admin/alerts"),
        ]);

        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setStats(data.stats);
          setCharts((current) => ({ ...current, ...(data.charts ?? {}) }));
        }

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const dailyTrend = useMemo(
    () =>
      charts.dailyValidations.map((day) => ({
        ...day,
        total: day.success + day.failed,
        label: new Date(day.date).toLocaleDateString("en", { weekday: "short" }),
      })),
    [charts.dailyValidations],
  );

  const ownerAlerts = useMemo(
    () => [
      {
        label: "Trials expiring soon",
        value: stats?.trialsExpiringSoon ?? 0,
        tone: "amber" as const,
        detail: "Need conversion follow-up within 7 days",
      },
      {
        label: "No resident accounts",
        value: stats?.estatesWithNoUsers ?? 0,
        tone: "rose" as const,
        detail: "Estates may be stuck before onboarding",
      },
      {
        label: "No validation activity",
        value: stats?.estatesWithNoValidations ?? 0,
        tone: "violet" as const,
        detail: "Setup may be incomplete or gates inactive",
      },
    ],
    [stats],
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${Math.max(mins, 1)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-violet-700" />
        <div className="absolute right-8 top-8 h-48 w-48 rounded-full border-[32px] border-white/10" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_520px] xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Owner command center</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-normal sm:text-6xl">
              Platform
              <span className="block text-emerald-300">Intelligence</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/70">
              Track estate growth, trial risk, validation activity, security outcomes, and operational setup health from one owner-level view.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroMetric label="Estates" value={stats?.totalEstates} loading={loading} />
            <HeroMetric label="Trialing" value={stats?.trialingEstates} loading={loading} />
            <HeroMetric label="Validations" value={stats?.monthValidations} loading={loading} />
            <HeroMetric label="Success" value={stats?.successRate} suffix="%" loading={loading} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Estates" value={stats?.totalEstates} icon={Building2} detail={`${stats?.activeEstates ?? 0} active`} loading={loading} />
        <MetricCard title="Residents" value={stats?.totalResidents} icon={Users} detail={`${stats?.totalUsers ?? 0} total users`} loading={loading} />
        <MetricCard title="Gate Checks Today" value={stats?.todayValidations} icon={Shield} detail={`${stats?.weekValidations ?? 0} this week`} loading={loading} />
        <MetricCard title="Failed Checks" value={stats?.failedValidations} icon={AlertTriangle} detail={`${stats?.successRate ?? 0}% success rate`} loading={loading} tone="rose" />
        <MetricCard title="Pilot Estates" value={stats?.pilotTrials} icon={Clock3} detail={`${stats?.trialsExpiringSoon ?? 0} trials expiring`} loading={loading} tone="violet" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          title="Validation Activity"
          eyebrow="Last 7 days"
          icon={Activity}
          action={<ChartLegend items={[["Successful", "#10b981"], ["Failed", "#ef4444"]]} />}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="successFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="failedFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<DashboardTooltip />} />
                <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={3} fill="url(#successFill)" />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={3} fill="url(#failedFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Estate Status" eyebrow="Portfolio mix" icon={PieChartIcon}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.estateStatus.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={68} outerRadius={104} paddingAngle={4}>
                  {charts.estateStatus.map((_, index) => (
                    <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DashboardTooltip />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="Owner Action Items" eyebrow="Needs attention" icon={Gauge}>
          <div className="space-y-3">
            {ownerAlerts.map((item) => (
              <ActionRow key={item.label} {...item} />
            ))}
          </div>
        </Panel>

        <Panel title="User Role Mix" eyebrow="Across estates" icon={Users}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.roleDistribution.filter((item) => item.value > 0)} layout="vertical" margin={{ left: 12, right: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={96} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<DashboardTooltip />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#6d28d9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Trial Monitor" eyebrow="Standard vs pilot" icon={Clock3}>
          <div className="grid gap-4">
            <DonutMini title="Trial types" data={charts.trialType} />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Paid" value={stats?.paidEstates ?? 0} />
              <MiniStat label="Expired" value={stats?.expiredTrials ?? 0} tone="rose" />
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Validation Outcomes" eyebrow="Security signal" icon={KeyRound}>
          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.validationOutcomes.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={4}>
                    {charts.validationOutcomes.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Pie>
                  <Tooltip content={<DashboardTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <BreakdownRow label="Successful checks" value={stats?.successfulValidations ?? 0} color="bg-emerald-500" />
              <BreakdownRow label="Failed checks" value={stats?.failedValidations ?? 0} color="bg-rose-500" />
              <BreakdownRow label="Guest passes" value={charts.passTypes.find((item) => item.name === "Guest")?.value ?? 0} color="bg-violet-700" />
              <BreakdownRow label="Staff passes" value={charts.passTypes.find((item) => item.name === "Staff")?.value ?? 0} color="bg-amber-500" />
            </div>
          </div>
        </Panel>

        <Panel title="Most Active Estates" eyebrow="By gate validations" icon={TrendingUp}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topEstatesByValidations} margin={{ left: 8, right: 8, bottom: 28 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<DashboardTooltip />} />
                <Bar dataKey="validations" fill="#6d28d9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="System Alerts" eyebrow={`${alerts.length} recent`} icon={AlertTriangle} className="xl:col-span-2">
          <div className="grid gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <SkeletonRow key={index} />)
            ) : alerts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-bold">All systems operational</p>
              </div>
            ) : (
              alerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <AlertIcon type={alert.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-950">{alert.message}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatTime(alert.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Gate Activity" eyebrow="Top gates" icon={DoorOpen}>
          <div className="space-y-3">
            {charts.gateActivity.length === 0 ? (
              <EmptyState text="No gate activity yet" />
            ) : (
              charts.gateActivity.slice(0, 6).map((gate, index) => (
                <ProgressRow key={gate.name} label={gate.name} value={gate.value} color={COLORS[index % COLORS.length]} max={charts.gateActivity[0]?.value || 1} />
              ))
            )}
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">Estate intelligence</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Portfolio Health</h2>
            <p className="text-sm text-slate-500">Recent estates with operational status, creation date, and drilldown access.</p>
          </div>
          <Link href="/super-admin/estates" className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-black text-white hover:bg-violet-800">
            View all estates
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <TableHead>Estate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Owner Action</TableHead>
              </tr>
            </thead>
            <tbody>
              {estates.slice(0, 8).map((estate) => (
                <tr key={estate.id} className="border-b border-slate-50">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                        <Building2 className="h-5 w-5 text-violet-700" />
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{estate.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{estate.id.slice(0, 12)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={estate.status} />
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-600">
                    {new Date(estate.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4">
                    <Link href={`/super-admin/estates/${estate.id}`} className="inline-flex items-center gap-1 font-black text-violet-700 hover:underline">
                      Open drilldown
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, suffix = "", loading }: { label: string; value?: number; suffix?: string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
      <div className="text-3xl font-black">{loading ? "..." : `${value ?? 0}${suffix}`}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/55">{label}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  loading,
  tone = "emerald",
}: {
  title: string;
  value?: number;
  detail: string;
  icon: React.ElementType;
  loading: boolean;
  tone?: "emerald" | "rose" | "violet";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{loading ? "..." : value ?? 0}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DashboardTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
      {label && <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6 text-sm">
            <span className="font-semibold text-slate-600">{item.name}</span>
            <span className="font-black text-slate-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="hidden items-center gap-4 text-xs font-bold text-slate-600 sm:flex">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function ActionRow({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "amber" | "rose" | "violet" }) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-black">{label}</p>
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="mt-1 text-sm font-semibold opacity-80">{detail}</p>
    </div>
  );
}

function DonutMini({ title, data }: { title: string; data: ChartSlice[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2 grid grid-cols-[120px_1fr] items-center gap-3">
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.filter((item) => item.value > 0)} dataKey="value" innerRadius={34} outerRadius={50} paddingAngle={4}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<DashboardTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="font-black text-slate-950">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone = "emerald" }: { label: string; value: number; tone?: "emerald" | "rose" }) {
  return (
    <div className={`rounded-lg p-4 ${tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}

function AlertIcon({ type }: { type: Alert["type"] }) {
  if (type === "error") return <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />;
  if (type === "warning") return <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />;
  if (type === "success") return <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />;
  return <Activity className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-700" />;
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = `${Math.max(6, Math.round((value / max) * 100))}%`;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width, backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function SkeletonRow() {
  return <div className="h-16 animate-pulse rounded-lg bg-slate-100" />;
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="py-3 pr-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{children}</th>;
}

function StatusBadge({ status }: { status: EstateRow["status"] }) {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "SUSPENDED"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${className}`}>
      {status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
      {status === "SUSPENDED" && <AlertTriangle className="h-3 w-3" />}
      {status === "TERMINATED" && <XCircle className="h-3 w-3" />}
      {status}
    </span>
  );
}
