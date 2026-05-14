import Link from "next/link";
import { Building2, DoorOpen, KeyRound, Mail, Phone, ShieldCheck, User, Users } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listValidationLogsForEstatePage } from "@/lib/repos/validation-logs";
import { listActivityLogsForEstatePage } from "@/lib/repos/activity-logs";
import { listResidentsForEstatePage } from "@/lib/repos/residents";
import { listGuardsForEstatePage, listUsersForEstate } from "@/lib/repos/users";
import { getEstateById } from "@/lib/repos/estates";
import { listGatesForEstate } from "@/lib/repos/gates";
import { SuperAdminValidationsSection } from "@/app/super-admin/estates/[estateId]/validations-section";
import { SuperAdminActivitySection } from "@/app/super-admin/estates/[estateId]/activity-section";
import { EstateActions } from "@/app/super-admin/estates/[estateId]/estate-actions";

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default async function SuperAdminEstatePage({
  params,
}: {
  params: { estateId: string };
}) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estateId = params.estateId;

  const [estate, validationsPage, activityPage, residentsPage, guardsPage, gates, allUsers] = await Promise.all([
    getEstateById(estateId),
    listValidationLogsForEstatePage({ estateId, limit: 50 }),
    listActivityLogsForEstatePage({ estateId, limit: 50 }),
    listResidentsForEstatePage({ estateId, limit: 50 }),
    listGuardsForEstatePage({ estateId, limit: 50 }),
    listGatesForEstate(estateId),
    listUsersForEstate({ estateId, limit: 100 }),
  ]);

  const estateAdmin = allUsers.find((u) => u.role === "ESTATE_ADMIN");

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/super-admin"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to estates
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{estate?.name || "Unknown Estate"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                estate?.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}>
                {estate?.status || "Unknown"}
              </span>
              <span className="text-xs text-slate-500">ID: {estateId}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {estate?.subscriptionTier} - {estate?.subscriptionStatus}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {estate?.trialType ?? "STANDARD"} trial
          </span>
          {estate?.trialEndsAt && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
              Trial ends {new Date(estate.trialEndsAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {estateAdmin && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Estate Administrator
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <User className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <div className="font-semibold text-slate-950">{estateAdmin.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  {estateAdmin.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{estateAdmin.email}</span>
                    </div>
                  )}
                  {estateAdmin.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{estateAdmin.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="h-5 w-5" />} label="Residents sampled" value={residentsPage.items.length} tone="emerald" />
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Registered guards" value={guardsPage.items.length} tone="sky" />
        <MetricCard icon={<DoorOpen className="h-5 w-5" />} label="Configured gates" value={gates.length} tone="indigo" />
        <MetricCard icon={<KeyRound className="h-5 w-5" />} label="Recent validations" value={validationsPage.items.length} tone="amber" />
      </div>

      <SuperAdminValidationsSection
        estateId={estateId}
        initialValidations={validationsPage.items}
        initialNextCursor={validationsPage.nextCursor ? base64UrlEncode(JSON.stringify(validationsPage.nextCursor)) : null}
      />

      <SuperAdminActivitySection
        estateId={estateId}
        initialActivity={activityPage.items}
        initialNextCursor={activityPage.nextCursor ? base64UrlEncode(JSON.stringify(activityPage.nextCursor)) : null}
      />

      <EstateActions
        estateId={estateId}
        estateName={estate?.name ?? "this estate"}
        subscriptionStatus={estate?.subscriptionStatus ?? ""}
        trialType={estate?.trialType ?? "STANDARD"}
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "sky" | "indigo" | "amber";
}) {
  const colors = {
    emerald: "text-emerald-700 bg-emerald-50",
    sky: "text-sky-700 bg-sky-50",
    indigo: "text-indigo-700 bg-indigo-50",
    amber: "text-amber-700 bg-amber-50",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-lg p-2 ${colors}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold text-slate-950">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
