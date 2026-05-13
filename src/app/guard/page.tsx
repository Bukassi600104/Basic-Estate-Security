import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default async function GuardDashboard() {
  const session = await requireSession();
  if (session.role !== "GUARD") return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="grid gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-white">Guard access</h2>
        <p className="text-sm text-white/60">
          Guards validate visitor codes in the Security PWA so every attempt is logged (including failures) with the selected gate.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          Install the Security PWA using the link shared by your estate admin.
        </div>
      </div>
    </div>
  );
}
