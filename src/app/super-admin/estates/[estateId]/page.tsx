import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { listValidationLogsForEstatePage } from "@/lib/repos/validation-logs";
import { listActivityLogsForEstatePage } from "@/lib/repos/activity-logs";
import { listResidentsForEstatePage } from "@/lib/repos/residents";
import { listGuardsForEstatePage } from "@/lib/repos/users";
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

  const [validationsPage, activityPage, residentsPage, guardsPage] = await Promise.all([
    listValidationLogsForEstatePage({ estateId, limit: 50 }),
    listActivityLogsForEstatePage({ estateId, limit: 50 }),
    listResidentsForEstatePage({ estateId, limit: 50 }),
    listGuardsForEstatePage({ estateId, limit: 50 }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/super-admin"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Back to estates
        </Link>
        <div className="text-sm font-semibold text-slate-900">{estateId}</div>
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
