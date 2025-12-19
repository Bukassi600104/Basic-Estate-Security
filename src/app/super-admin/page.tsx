import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/db";
import { SuperAdminEstatesTable } from "@/app/super-admin/estates-table";

export default async function SuperAdminDashboard() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estates = await prisma.estate.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <SuperAdminEstatesTable
      estates={estates.map((e) => ({
        id: e.id,
        name: e.name,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}
