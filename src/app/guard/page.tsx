import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default async function GuardDashboard() {
  const session = await requireSession();
  if (session.role !== "GUARD") return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="grid gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Guard access</h2>
        <p className="text-sm text-slate-600">
          Guards validate visitor codes in the Security PWA so every attempt is logged (including failures) with the selected gate.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Install the Security PWA using the link shared by your estate admin.
        </div>
      </div>
    </div>
  );
}
