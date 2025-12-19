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
          Guards validate visitor codes via Telegram to ensure every attempt is logged
          (including failures) with the selected gate.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Open the Estate Security Bot in Telegram and use:
          <span className="font-semibold"> Validate Code</span>.
        </div>
      </div>
    </div>
  );
}
