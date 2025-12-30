import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";

export default async function DashboardRouter() {
  const session = await requireSession();

  switch (session.role) {
    case "SUPER_ADMIN":
      redirect("/super-admin");
    case "ESTATE_ADMIN":
      redirect("/estate-admin");
    case "GUARD":
      redirect("/security-app");
    case "RESIDENT":
    case "RESIDENT_DELEGATE":
      redirect("/resident-app");
    default:
      redirect("/auth/sign-in");
  }
}
