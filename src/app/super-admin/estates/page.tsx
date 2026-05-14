import { SuperAdminEstatesTable } from "@/app/super-admin/estates-table";
import { requireSession } from "@/lib/auth/require-session";
import { listEstatesPage } from "@/lib/repos/estates";
import { Building2 } from "lucide-react";

export default async function SuperAdminEstatesPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const page = await listEstatesPage({ limit: 50 });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-violet-700" />
        <div className="absolute right-8 top-8 h-36 w-36 rounded-full border-[24px] border-white/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Tenant portfolio</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-normal">
              Estate
              <span className="block text-emerald-300">Directory</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/70">
              Manage estate lifecycle, open drilldowns, and inspect setup status without exposing resident private details.
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/20 bg-white/10">
            <Building2 className="h-8 w-8" />
          </div>
        </div>
      </section>

      <SuperAdminEstatesTable
        initialEstates={page.items.map((e) => ({
          id: e.estateId,
          name: e.name,
          status: (e.status === "INACTIVE" ? "SUSPENDED" : e.status) as "ACTIVE" | "SUSPENDED" | "TERMINATED",
          createdAt: e.createdAt,
        }))}
        initialNextCursor={page.nextCursor ?? null}
      />
    </div>
  );
}
