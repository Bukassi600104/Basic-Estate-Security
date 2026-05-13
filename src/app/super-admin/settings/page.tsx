"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Key, Loader2, Lock, ShieldCheck } from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasLength = newPassword.length >= 8;
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
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to change password");

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  function Req({ met, text }: { met: boolean; text: string }) {
    return (
      <div className={`flex items-center gap-2 text-xs ${met ? "text-emerald-400" : "text-white/50"}`}>
        {met ? <Check className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-white/15" />}
        {text}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="text-sm text-white/60">Manage your super admin account.</p>
        </div>

        {/* Change Password */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-white">Change Password</h2>
              <p className="text-sm text-white/60">Update your login password</p>
            </div>
          </div>

          {success && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-300">Password changed successfully!</p>
                <p className="text-sm text-emerald-400">Your new password is now active.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-white/70">Current Password</span>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-11 text-base font-medium text-white outline-none ring-brand-green/20 focus:border-brand-green/50 focus:ring-4"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-white/70">New Password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-11 text-base font-medium text-white outline-none ring-brand-green/20 focus:border-brand-green/50 focus:ring-4"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {newPassword.length > 0 && (
                <div className="mt-2 grid gap-1.5 rounded-xl border border-white/5 bg-white/5 p-3">
                  <p className="text-xs font-semibold text-white/70">Password requirements:</p>
                  <Req met={hasLength} text="At least 8 characters" />
                  <Req met={hasUpper} text="Uppercase letter (A-Z)" />
                  <Req met={hasLower} text="Lowercase letter (a-z)" />
                  <Req met={hasDigit} text="Number (0-9)" />
                  <Req met={hasSpecial} text="Special character (!@#$%^&*)" />
                </div>
              )}
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-white/70">Confirm New Password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`h-12 w-full rounded-xl border bg-white/5 pl-11 pr-11 text-base font-medium text-white outline-none focus:ring-4 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-rose-300 ring-rose-100 focus:border-rose-500"
                      : "border-white/10 ring-brand-green/20 focus:border-brand-green/50"
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <span className="text-xs font-medium text-rose-400">Passwords do not match</span>
              )}
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
