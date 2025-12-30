import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { getEstateById } from "@/lib/repos/estates";

export const metadata = {
  title: "Security Portal",
};

export default async function SecurityAppLayout({ children }: { children: ReactNode }) {
  // Require authenticated session - redirect to sign-in if not logged in
  const session = await requireSession({ redirectTo: "/auth/sign-in" });

  // Only allow guards
  if (session.role !== "GUARD") {
    // If user is logged in but wrong role, redirect to dashboard
    redirect("/dashboard");
  }

  // Verify estate is active
  if (session.estateId) {
    const estate = await getEstateById(session.estateId);
    if (!estate || estate.status !== "ACTIVE") {
      notFound();
    }
  }

  return (
    <div className="min-h-[calc(100vh-2rem)]">
      {children}
    </div>
  );
}
