import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { GuardCreator } from "@/app/estate-admin/guard-creator";
import { EstateAdminStats } from "@/app/estate-admin/estate-stats";
import { ArrowRight, ListChecks, Settings, UserPlus, Users } from "lucide-react";

export default async function EstateAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN") return null;

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Estate Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage residents, guards, and monitor activity
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/estate-admin/onboard"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-navy/90"
            >
              <UserPlus className="h-4 w-4" />
              Onboard Resident
            </Link>
            <Link
              href="/estate-admin/logs"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              <ListChecks className="h-4 w-4" />
              View Logs
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <EstateAdminStats />

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/estate-admin/residents"
          className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-navy/30 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Residents</p>
            <p className="text-sm text-slate-500">Manage all residents</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-navy" />
        </Link>

        <Link
          href="/estate-admin/gates"
          className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-navy/30 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Gates</p>
            <p className="text-sm text-slate-500">Configure entry points</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-navy" />
        </Link>

        <Link
          href="/estate-admin/logs"
          className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-navy/30 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
            <ListChecks className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Validation Logs</p>
            <p className="text-sm text-slate-500">View entry history</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-navy" />
        </Link>

        <Link
          href="/estate-admin/settings"
          className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-navy/30 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-600 group-hover:text-white">
            <Settings className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">Settings</p>
            <p className="text-sm text-slate-500">Estate configuration</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-navy" />
        </Link>
      </div>

      {/* Guard Creator Section */}
      <GuardCreator />
    </div>
  );
}
