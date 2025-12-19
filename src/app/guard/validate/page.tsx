export default function GuardValidatePage() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="grid gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Validate code</h1>
        <p className="text-sm text-slate-600">
          Code validation is handled in Telegram so every attempt is logged (including failures)
          with the selected gate.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Open the Estate Security Bot in Telegram and use:
          <span className="font-semibold"> Validate Code</span>.
        </div>
      </div>
    </div>
  );
}
