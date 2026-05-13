import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getEstateById } from "@/lib/repos/estates";
import { GuardCreator } from "@/app/estate-admin/guard-creator";
import { EstateAdminStats } from "@/app/estate-admin/estate-stats";
import { ArrowRight, ListChecks, Settings, UserPlus, Users } from "lucide-react";

export default async function EstateAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN") return null;

  const estate = session.estateId ? await getEstateById(session.estateId) : null;

  return (
    <div className="grid gap-6">
      {/* Header with Estate Name */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {estate?.name || "Estate Dashboard"}
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  Manage residents, guards, and monitor activity
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/estate-admin/onboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-green/25 hover:shadow-brand-green/40"
            >
              <UserPlus className="h-4 w-4" />
              Onboard Resident
            </Link>
            <Link
              href="/estate-admin/logs"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
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
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-brand-green/20 hover:bg-white/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green transition-colors group-hover:bg-brand-green/25">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">Residents</p>
            <p className="text-sm text-white/40">Manage all residents</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/20 transition-colors group-hover:text-brand-green" />
        </Link>

        <Link
          href="/estate-admin/gates"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-brand-green/20 hover:bg-white/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 transition-colors group-hover:bg-emerald-500/25">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">Gates</p>
            <p className="text-sm text-white/40">Configure entry points</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/20 transition-colors group-hover:text-brand-green" />
        </Link>

        <Link
          href="/estate-admin/logs"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-brand-green/20 hover:bg-white/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 transition-colors group-hover:bg-purple-500/25">
            <ListChecks className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">Validation Logs</p>
            <p className="text-sm text-white/40">View entry history</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/20 transition-colors group-hover:text-brand-green" />
        </Link>

        <Link
          href="/estate-admin/settings"
          className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-brand-green/20 hover:bg-white/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white/60 transition-colors group-hover:bg-white/15">
            <Settings className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">Settings</p>
            <p className="text-sm text-white/40">Estate configuration</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/20 transition-colors group-hover:text-brand-green" />
        </Link>
      </div>

      {/* Guard Creator Section */}
      <GuardCreator />
    </div>
  );
}
