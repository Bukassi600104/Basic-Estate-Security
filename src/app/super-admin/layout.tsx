import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import { Building2, Settings } from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <AppShell
      title="Super Administrator"
      nav={[
        { href: "/super-admin", label: "Estates", icon: <Building2 className="h-4 w-4" /> },
      ]}
      bottomNav={[
        { href: "/super-admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
