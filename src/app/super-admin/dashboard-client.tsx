"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronRight,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { AlertBadge } from "@/components/ui/AlertBadge";

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
};

type DailyValidation = {
  date: string;
  success: number;
  failed: number;
};

type Alert = {
  id: string;
  type: "error" | "warning" | "success" | "info";
  message: string;
  timestamp: string;
  estateId?: string;
  estateName?: string;
};

export function SuperAdminDashboardClient({
  initialEstates,
  initialNextCursor,
}: {
  initialEstates: EstateRow[];
  initialNextCursor: string | null;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyData, setDailyData] = useState<DailyValidation[]>([]);
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
          setDailyData(data.charts?.dailyValidations || []);
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Calculate max for chart scaling
  const maxValidations = Math.max(
    ...dailyData.map((d) => d.success + d.failed),
    1
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Estates"
          value={stats?.totalEstates ?? 0}
          icon={Building2}
          trend={stats?.activeEstates ? `${stats.activeEstates} active` : undefined}
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          trend={stats?.totalResidents ? `${stats.totalResidents} residents` : undefined}
          loading={loading}
        />
        <StatCard
          title="Today's Validations"
          value={stats?.todayValidations ?? 0}
          icon={Shield}
          trend={stats?.weekValidations ? `${stats.weekValidations} this week` : undefined}
          loading={loading}
        />
        <StatCard
          title="Success Rate"
          value={stats?.successRate ?? 0}
          suffix="%"
          icon={TrendingUp}
          trend={stats?.totalValidations ? `${stats.totalValidations} total` : undefined}
          loading={loading}
          variant={stats?.successRate && stats.successRate >= 90 ? "success" : "default"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alerts Panel */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">System Alerts</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {alerts.length} alerts
            </span>
          </div>

          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p className="mt-2 text-sm font-medium">All systems operational</p>
              </div>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <AlertBadge
                  key={alert.id}
                  type={alert.type}
                  message={alert.message}
                  timestamp={formatTime(alert.timestamp)}
                />
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-navy" />
            <h2 className="text-lg font-bold text-slate-900">Quick Stats</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Active Estates</p>
                  <p className="text-xs text-slate-500">Operating normally</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {loading ? "—" : stats?.activeEstates ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Suspended</p>
                  <p className="text-xs text-slate-500">Require attention</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-600">
                {loading ? "—" : stats?.suspendedEstates ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Guards</p>
                  <p className="text-xs text-slate-500">Registered</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {loading ? "—" : stats?.totalGuards ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Trend Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Validation Trends</h2>
            <p className="text-sm text-slate-500">Last 7 days across all estates</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-brand-green" />
              <span className="text-slate-600">Success</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="text-slate-600">Failed</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex h-48 items-end gap-2">
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-t-lg bg-slate-100" style={{ height: `${30 + Math.random() * 50}%` }} />
            ))
          ) : dailyData.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              No data available
            </div>
          ) : (
            dailyData.map((day) => {
              const total = day.success + day.failed;
              const successHeight = total > 0 ? (day.success / maxValidations) * 100 : 0;
              const failedHeight = total > 0 ? (day.failed / maxValidations) * 100 : 0;

              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-col gap-0.5" style={{ height: "160px" }}>
                    <div
                      className="w-full rounded-t bg-rose-500 transition-all"
                      style={{ height: `${failedHeight}%`, minHeight: failedHeight > 0 ? "4px" : "0" }}
                    />
                    <div
                      className="w-full rounded-b bg-brand-green transition-all"
                      style={{ height: `${successHeight}%`, minHeight: successHeight > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Estates Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Estates</h2>
            <p className="text-sm text-slate-500">Recently registered estates</p>
          </div>
          <Link
            href="/super-admin/estates"
            className="flex items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Estate
                </th>
                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Created
                </th>
                <th className="py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {estates.slice(0, 5).map((estate) => (
                <tr key={estate.id} className="border-b border-slate-50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/10">
                        <Building2 className="h-4 w-4 text-brand-navy" />
                      </div>
                      <span className="font-semibold text-slate-900">{estate.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        estate.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : estate.status === "SUSPENDED"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {estate.status === "ACTIVE" && <CheckCircle className="h-3 w-3" />}
                      {estate.status === "SUSPENDED" && <AlertTriangle className="h-3 w-3" />}
                      {estate.status === "TERMINATED" && <XCircle className="h-3 w-3" />}
                      {estate.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {new Date(estate.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/super-admin/estates/${estate.id}`}
                      className="text-sm font-semibold text-brand-navy hover:underline"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
