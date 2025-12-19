import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { GuardCreator } from "@/app/estate-admin/guard-creator";
import { ArrowRight, ListChecks, UserPlus } from "lucide-react";

export default async function EstateAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN") return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              Dashboard overview
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Onboard residents and review validations and activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/estate-admin/onboard"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Onboard resident
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/estate-admin/logs"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
            >
              <ListChecks className="h-4 w-4" />
              View logs
            </Link>
          </div>
        </div>
      </div>

      <GuardCreator />
    </div>
  );
}
