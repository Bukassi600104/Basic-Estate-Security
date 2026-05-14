"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, FlaskConical, Trash2, X } from "lucide-react";
import { Spinner } from "@/components/Spinner";

function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
            <AlertTriangle className="h-5 w-5 text-rose-700" />
          </div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">{description}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? <Spinner className="text-white" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EstateActions({
  estateId,
  estateName,
  subscriptionStatus,
  trialType,
}: {
  estateId: string;
  estateName: string;
  subscriptionStatus: string;
  trialType: "STANDARD" | "PILOT";
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"end_trial" | "terminate" | "extend_trial" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTrialing = subscriptionStatus === "TRIALING";

  async function patchEstate(body: Record<string, unknown>, fallback: string) {
    const res = await fetch(`/api/super-admin/estates/${estateId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? fallback);
    }
  }

  async function handleEndTrial() {
    setLoading(true);
    setError(null);
    try {
      await patchEstate({ action: "end_trial" }, "Failed to end trial");
      setModal(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtendTrial() {
    setLoading(true);
    setError(null);
    try {
      await patchEstate({ action: "extend_trial", days: 90 }, "Failed to extend trial");
      setModal(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleTerminate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/estates/${estateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to terminate estate");
      }
      setModal(null);
      router.push("/super-admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
          Owner Controls
        </h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setError(null); setModal("extend_trial"); }}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <FlaskConical className="h-4 w-4" />
            {trialType === "PILOT" ? "Refresh 90-Day Pilot" : "Give 90-Day Pilot"}
          </button>

          {isTrialing && (
            <button
              onClick={() => { setError(null); setModal("end_trial"); }}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <Clock className="h-4 w-4" />
              End Trial Period
            </button>
          )}

          <button
            onClick={() => { setError(null); setModal("terminate"); }}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Terminate Estate
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      </div>

      {modal === "extend_trial" && (
        <ConfirmModal
          title="Give 90-Day Pilot Trial"
          description={`This will mark "${estateName}" as a pilot estate and set its trial to 90 days from today. Public sign-ups remain on the normal 30-day trial.`}
          confirmLabel="Apply 90 Days"
          confirmClass="bg-emerald-700 hover:bg-emerald-800"
          onConfirm={handleExtendTrial}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}

      {modal === "end_trial" && (
        <ConfirmModal
          title="End Trial Period"
          description={`This will immediately expire the free trial for "${estateName}". They will lose access until they subscribe to a paid plan.`}
          confirmLabel="End Trial Now"
          confirmClass="bg-amber-600 hover:bg-amber-700"
          onConfirm={handleEndTrial}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}

      {modal === "terminate" && (
        <ConfirmModal
          title="Terminate Estate"
          description={`This will block "${estateName}" from portal access. Data is retained for audit history instead of being physically deleted.`}
          confirmLabel="Terminate Estate"
          confirmClass="bg-rose-700 hover:bg-rose-800"
          onConfirm={handleTerminate}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}
    </>
  );
}
