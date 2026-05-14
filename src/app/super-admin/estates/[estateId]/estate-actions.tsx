"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Trash2, X } from "lucide-react";
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.15] bg-[#0f2318] p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/50 hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>

        <p className="text-sm text-white/65 leading-relaxed">{description}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg border border-white/15 bg-white/[0.07] text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.12]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60 ${confirmClass}`}
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
}: {
  estateId: string;
  estateName: string;
  subscriptionStatus: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"end_trial" | "delete" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTrialing = subscriptionStatus === "TRIALING";

  async function handleEndTrial() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/estates/${estateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "end_trial" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to end trial");
      }
      setModal(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/estates/${estateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete estate");
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
      <div className="mt-6 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 mb-4">
          Admin Actions
        </h2>

        <div className="flex flex-wrap gap-3">
          {isTrialing && (
            <button
              onClick={() => { setError(null); setModal("end_trial"); }}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Clock className="h-4 w-4" />
              End Trial Period
            </button>
          )}

          <button
            onClick={() => { setError(null); setModal("delete"); }}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete Estate Account
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>

      {modal === "end_trial" && (
        <ConfirmModal
          title="End Trial Period"
          description={`This will immediately expire the free trial for "${estateName}". They will lose access until they subscribe to a paid plan. This cannot be undone.`}
          confirmLabel="End Trial Now"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          onConfirm={handleEndTrial}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}

      {modal === "delete" && (
        <ConfirmModal
          title="Delete Estate Account"
          description={`This will permanently delete "${estateName}" and all associated data — residents, guards, codes, and logs. All user accounts will also be deleted. This action is irreversible.`}
          confirmLabel="Delete Permanently"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
          loading={loading}
        />
      )}
    </>
  );
}
