import { requireSession } from "@/lib/auth/require-session";

export default async function ResidentDashboard() {
  const session = await requireSession();
  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="grid gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Resident access</h2>
        <p className="text-sm text-slate-600">
          Residents generate visitor codes and manage house-help codes via Telegram.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Open the Estate Security Bot in Telegram and use the buttons:
          <span className="font-semibold"> Generate Visitor Code</span> and
          <span className="font-semibold"> Manage House Help Codes</span>.
        </div>
      </div>
    </div>
  );
}
