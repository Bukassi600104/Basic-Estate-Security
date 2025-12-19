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
    case "RESIDENT":
    case "RESIDENT_DELEGATE":
      return (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="grid gap-3">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Use Telegram</h2>
            <p className="text-sm text-slate-600">
              Your day-to-day actions happen in Telegram. This web dashboard is primarily for admins.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              Open the Estate Security Bot in Telegram and follow the on-screen buttons.
            </div>
          </div>
        </div>
      );
    default:
      redirect("/auth/sign-in");
  }
}
