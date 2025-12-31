import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import { Settings } from "lucide-react";
import { getEstateById } from "@/lib/repos/estates";

export default async function EstateAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.role !== "ESTATE_ADMIN") redirect("/dashboard");

  if (session.estateId) {
    const estate = await getEstateById(session.estateId);
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
  }

  return (
    <AppShell
      title="Estate Administrator"
      nav={[
        { href: "/estate-admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
