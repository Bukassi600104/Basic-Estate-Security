import { requireSession } from "@/lib/auth/require-session";
import { SuperAdminEstatesTable } from "@/app/super-admin/estates-table";
import { listEstatesPage } from "@/lib/repos/estates";

export default async function SuperAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const page = await listEstatesPage({ limit: 50 });

  return (
    <SuperAdminEstatesTable
      initialEstates={page.items.map((e) => ({
        id: e.estateId,
        name: e.name,
        // The UI only supports these statuses; treat legacy INACTIVE as SUSPENDED.
        status: (e.status === "INACTIVE" ? "SUSPENDED" : e.status) as "ACTIVE" | "SUSPENDED" | "TERMINATED",
        createdAt: e.createdAt,
      }))}
      initialNextCursor={page.nextCursor ? Buffer.from(JSON.stringify(page.nextCursor), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") : null}
    />
  );
}
