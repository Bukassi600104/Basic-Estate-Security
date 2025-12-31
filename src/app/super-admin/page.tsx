import { requireSession } from "@/lib/auth/require-session";
import { SuperAdminDashboardClient } from "@/app/super-admin/dashboard-client";
import { listEstatesPage } from "@/lib/repos/estates";

export default async function SuperAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const page = await listEstatesPage({ limit: 50 });

  return (
    <SuperAdminDashboardClient
      initialEstates={page.items.map((e) => ({
        id: e.estateId,
        name: e.name,
        status: (e.status === "INACTIVE" ? "SUSPENDED" : e.status) as "ACTIVE" | "SUSPENDED" | "TERMINATED",
        createdAt: e.createdAt,
      }))}
      initialNextCursor={
        page.nextCursor
          ? Buffer.from(JSON.stringify(page.nextCursor), "utf8")
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/g, "")
          : null
      }
    />
  );
}
