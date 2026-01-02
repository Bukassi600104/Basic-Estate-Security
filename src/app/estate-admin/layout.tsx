import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import { Home, Users, DoorOpen, ClipboardList, Key, Settings, UserPlus } from "lucide-react";
import { getEstateById } from "@/lib/repos/estates";
import { TrialBanner } from "@/components/trial-banner";

export default async function EstateAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN" && session.role !== "SUB_ADMIN") {
    redirect("/dashboard");
  }

  // Get estate data for subscription info
  const estate = session.estateId ? await getEstateById(session.estateId) : null;

  if (estate && estate.status !== "ACTIVE") {
    return (
      <AppShell title="Estate Admin" nav={[]}>
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Access revoked</h2>
          <p className="mt-2 text-sm text-slate-600">
            This estate is <span className="font-semibold">{estate.status}</span>. Portal access is blocked.
          </p>
        </div>
      </AppShell>
    );
  }

  // Build navigation items
  const navItems = [
    { href: "/estate-admin", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
    { href: "/estate-admin/residents", label: "Residents", icon: <Users className="h-4 w-4" /> },
    { href: "/estate-admin/gates", label: "Gates", icon: <DoorOpen className="h-4 w-4" /> },
    { href: "/estate-admin/logs", label: "Activity Logs", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/estate-admin/credential-resets", label: "Password Resets", icon: <Key className="h-4 w-4" /> },
  ];

  // Add Team nav item if sub-admin feature is enabled (Standard+ tiers)
  // Only estate admins (not sub-admins) can manage team
  if (estate?.features?.subAdminEnabled && session.role === "ESTATE_ADMIN") {
    navItems.push({
      href: "/estate-admin/team",
      label: "Team",
      icon: <UserPlus className="h-4 w-4" />,
    });
  }

  return (
    <AppShell
      title="Estate Administrator"
      nav={navItems}
      bottomNav={[
        { href: "/estate-admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
    >
      {/* Trial banner - shows at top of content */}
      {estate && <TrialBanner estate={estate} />}

      {children}
    </AppShell>
  );
}
