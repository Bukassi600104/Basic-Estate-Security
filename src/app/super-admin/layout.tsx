import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import { Building2, LayoutGrid } from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <AppShell
      title="Super Admin"
      nav={[
        { href: "/super-admin", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
        { href: "/super-admin", label: "Estates", icon: <Building2 className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
