import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/require-session";
import { LayoutGrid } from "lucide-react";

export default async function GuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.role !== "GUARD") redirect("/dashboard");

  return (
    <AppShell
      title="Guard Portal"
      nav={[
        { href: "/guard", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
