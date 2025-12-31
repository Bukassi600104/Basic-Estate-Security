import Link from "next/link";
import { Building2, Mail, Phone, User } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { listValidationLogsForEstatePage } from "@/lib/repos/validation-logs";
import { listActivityLogsForEstatePage } from "@/lib/repos/activity-logs";
import { listResidentsForEstatePage } from "@/lib/repos/residents";
import { listGuardsForEstatePage, listUsersForEstate } from "@/lib/repos/users";
import { getEstateById } from "@/lib/repos/estates";
import { SuperAdminValidationsSection } from "@/app/super-admin/estates/[estateId]/validations-section";
import { SuperAdminActivitySection } from "@/app/super-admin/estates/[estateId]/activity-section";
import { SuperAdminGuardsSection } from "@/app/super-admin/estates/[estateId]/guards-section";
import { SuperAdminResidentsSection } from "@/app/super-admin/estates/[estateId]/residents-section";

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

  const [estate, validationsPage, activityPage, residentsPage, guardsPage, allUsers] = await Promise.all([
    getEstateById(estateId),
    listValidationLogsForEstatePage({ estateId, limit: 50 }),
    listActivityLogsForEstatePage({ estateId, limit: 50 }),
    listResidentsForEstatePage({ estateId, limit: 50 }),
    listGuardsForEstatePage({ estateId, limit: 50 }),
    listUsersForEstate({ estateId, limit: 100 }),
  ]);

  // Find the estate admin
  const estateAdmin = allUsers.find((u) => u.role === "ESTATE_ADMIN");

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/super-admin"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Back to estates
        </Link>
      </div>

      {/* Estate Info Card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{estate?.name || "Unknown Estate"}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                estate?.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {estate?.status || "Unknown"}
              </span>
              <span className="text-xs text-slate-500">ID: {estateId}</span>
            </div>
          </div>
        </div>

        {/* Estate Admin Contact */}
        {estateAdmin && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
              Estate Administrator
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/10">
                <User className="h-5 w-5 text-brand-navy" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">{estateAdmin.name}</div>
                <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-slate-600">
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

      <SuperAdminValidationsSection
        estateId={estateId}
        initialValidations={validationsPage.items}
        initialNextCursor={validationsPage.nextCursor ? base64UrlEncode(JSON.stringify(validationsPage.nextCursor)) : null}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SuperAdminResidentsSection
          estateId={estateId}
          initialResidents={residentsPage.items}
          initialNextCursor={residentsPage.nextCursor ? base64UrlEncode(JSON.stringify(residentsPage.nextCursor)) : null}
        />

        <SuperAdminGuardsSection
          estateId={estateId}
          initialGuards={guardsPage.items
            .map((u) => ({
              userId: u.userId,
              name: u.name,
              identifier: u.email ?? u.phone ?? "—",
              createdAt: u.createdAt,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))}
          initialNextCursor={guardsPage.nextCursor ? base64UrlEncode(JSON.stringify(guardsPage.nextCursor)) : null}
        />
      </div>

      <SuperAdminActivitySection
        estateId={estateId}
        initialActivity={activityPage.items}
        initialNextCursor={activityPage.nextCursor ? base64UrlEncode(JSON.stringify(activityPage.nextCursor)) : null}
      />
    </div>
  );
}
