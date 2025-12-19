import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import { LayoutGrid } from "lucide-react";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="Resident Portal"
      nav={[
        { href: "/resident", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
