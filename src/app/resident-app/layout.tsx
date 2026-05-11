import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { getEstateById } from "@/lib/repos/estates";
import { ResidentLayoutShell } from "./layout-shell";

export const metadata = {
  title: "Resident Portal",
};

export default async function ResidentAppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession({ redirectTo: "/auth/sign-in" });

  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    redirect("/dashboard");
  }

  if (session.estateId) {
    const estate = await getEstateById(session.estateId);
    if (!estate || estate.status !== "ACTIVE") {
      notFound();
    }
  }

  return <ResidentLayoutShell>{children}</ResidentLayoutShell>;
}
