"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Key, Loader2, Lock, ShieldAlert, ShieldCheck, X } from "lucide-react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function FirstLoginPopup({ onClose, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password requirements
  const hasLength = newPassword.length >= 5 && newPassword.length <= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const isValidPassword = hasLength && hasUpper && hasLower && hasDigit && hasSpecial;
  const canSubmit = currentPassword.length > 0 && isValidPassword && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/resident/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to change password");

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
      <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-slate-500"}`}>
        {met ? (
          <Check className="h-3 w-3" />
        ) : (
          <div className="h-3 w-3 rounded-full border border-slate-300" />
        )}
        {text}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-slate-100 p-5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Change Your Password</h2>
            <p className="mt-1 text-sm text-slate-600">
              For security, please change your initial password before continuing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            {/* Current Password */}
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-700">Current Password</span>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-base outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {/* New Password */}
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-700">New Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-base outline-none focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {newPassword.length > 0 && (
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-2">
                  <RequirementItem met={hasLength} text="5-8 chars" />
                  <RequirementItem met={hasUpper} text="Uppercase" />
                  <RequirementItem met={hasLower} text="Lowercase" />
                  <RequirementItem met={hasDigit} text="Number" />
                  <RequirementItem met={hasSpecial} text="Special (!@#$)" />
                </div>
              )}
            </label>

            {/* Confirm Password */}
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-700">Confirm New Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`h-11 w-full rounded-xl border bg-white pl-10 pr-10 text-base outline-none focus:ring-2 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <span className="text-xs text-rose-600">Passwords do not match</span>
              )}
            </label>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Later
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-navy text-sm font-bold text-white hover:bg-brand-navy/90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
