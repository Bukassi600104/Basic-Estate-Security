import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Clock3,
  CreditCard,
  DoorOpen,
  Settings,
} from "lucide-react";

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
        { href: "/super-admin", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
        { href: "/super-admin/estates", label: "Estates", icon: <Building2 className="h-4 w-4" /> },
        { href: "/super-admin#trial-monitor", label: "Trials", icon: <Clock3 className="h-4 w-4" /> },
        { href: "/super-admin#security-monitor", label: "Security", icon: <AlertTriangle className="h-4 w-4" /> },
        { href: "/super-admin#operations-monitor", label: "Operations", icon: <DoorOpen className="h-4 w-4" /> },
        { href: "/super-admin#business-monitor", label: "Business", icon: <CreditCard className="h-4 w-4" /> },
      ]}
      bottomNav={[
        { href: "/super-admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
