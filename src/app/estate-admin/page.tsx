import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getEstateById } from "@/lib/repos/estates";
import { GuardCreator } from "@/app/estate-admin/guard-creator";
import { EstateAdminStats } from "@/app/estate-admin/estate-stats";
import { ArrowRight, DoorOpen, ListChecks, Settings, ShieldCheck, UserPlus, Users } from "lucide-react";
import { listGatesForEstate } from "@/lib/repos/gates";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";

export default async function EstateAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN") return null;

  const estate = session.estateId ? await getEstateById(session.estateId) : null;
  const [gates, logs] = session.estateId
    ? await Promise.all([
        listGatesForEstate(session.estateId),
        listValidationLogsForEstate({ estateId: session.estateId, limit: 8 }),
      ])
    : [[], []];

  const daysRemaining = estate?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(estate.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Estate workspace</p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                  {estate?.name || "Estate Dashboard"}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {estate?.address || "No address saved"} · Admin: {session.name}
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Plan</div>
                <div className="mt-1 font-bold text-slate-950">{estate?.subscriptionTier ?? "BASIC"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Trial</div>
                <div className="mt-1 font-bold text-slate-950">
                  {daysRemaining === null ? "Not set" : `${daysRemaining} days`}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Gates</div>
                <div className="mt-1 font-bold text-slate-950">{gates.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="px-6 py-5">
            <p className="text-sm font-semibold text-slate-600">
              Start with resident onboarding, then configure gates and guard access for live validations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 px-6 pb-6 md:pb-0">
            <Link
              href="/estate-admin/onboard"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <UserPlus className="h-4 w-4" />
              Onboard Resident
            </Link>
            <Link
              href="/estate-admin/logs"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
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
          className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-950">Residents</p>
            <p className="text-sm text-slate-500">Manage all residents</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-emerald-700" />
        </Link>

        <Link
          href="/estate-admin/gates"
          className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700 transition-colors group-hover:bg-sky-100">
            <DoorOpen className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-950">Gates</p>
            <p className="text-sm text-slate-500">Configure entry points</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-sky-700" />
        </Link>

        <Link
          href="/estate-admin/logs"
          className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 transition-colors group-hover:bg-indigo-100">
            <ListChecks className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-950">Validation Logs</p>
            <p className="text-sm text-slate-500">View entry history</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-indigo-700" />
        </Link>

        <Link
          href="/estate-admin/settings"
          className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-200">
            <Settings className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-950">Settings</p>
            <p className="text-sm text-slate-500">Estate configuration</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-slate-700" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-950">Recent gate activity</h2>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {logs.length ? logs.map((log) => (
              <div key={log.logId} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{log.gateName}</p>
                  <p className="text-sm text-slate-500">{log.outcome} · {log.decision}</p>
                </div>
                <p className="text-sm text-slate-500">{new Date(log.validatedAt).toLocaleString("en-NG")}</p>
              </div>
            )) : (
              <div className="py-8 text-sm text-slate-500">No validation activity yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <h2 className="text-lg font-bold">Operational checklist</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2">
              <span>Estate profile</span>
              <span className="font-semibold text-emerald-300">Ready</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2">
              <span>Gates configured</span>
              <span className="font-semibold text-emerald-300">{gates.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white/10 px-3 py-2">
              <span>Trial type</span>
              <span className="font-semibold text-emerald-300">{estate?.trialType ?? "STANDARD"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guard Creator Section */}
      <GuardCreator />
    </div>
  );
}
