"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, Key, Loader2, Lock, ShieldCheck } from "lucide-react";

export default function ResidentSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/resident/change-password", {
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

  function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
      <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-slate-500"}`}>
        {met ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border border-slate-300" />
        )}
        {text}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white pb-8">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-navy/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-green/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Link
            href="/resident-app/codes"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Settings
            </h1>
            <p className="text-sm text-slate-600">Manage your account</p>
          </div>
        </header>

        {/* Change Password Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Change Password</h2>
              <p className="text-sm text-slate-600">Update your login password</p>
            </div>
          </div>

          {success && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">Password changed successfully!</p>
                <p className="text-sm text-green-700">Your new password is now active.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            {/* Current Password */}
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">Current Password</span>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-base font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {/* New Password */}
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">New Password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-base font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword.length > 0 && (
                <div className="mt-2 grid gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Password requirements:</p>
                  <RequirementItem met={hasLength} text="5-8 characters" />
                  <RequirementItem met={hasUpper} text="Uppercase letter (A-Z)" />
                  <RequirementItem met={hasLower} text="Lowercase letter (a-z)" />
                  <RequirementItem met={hasDigit} text="Number (0-9)" />
                  <RequirementItem met={hasSpecial} text="Special character (!@#$%^&*)" />
                </div>
              )}
            </label>

            {/* Confirm Password */}
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">Confirm New Password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`h-12 w-full rounded-xl border bg-white pl-11 pr-11 text-base font-medium text-slate-900 outline-none focus:ring-4 ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-rose-300 ring-rose-100 focus:border-rose-500"
                      : "border-slate-200 ring-brand-navy/20 focus:border-brand-navy"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <span className="text-xs font-medium text-rose-600">Passwords do not match</span>
              )}
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-navy/90 disabled:opacity-60"
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

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/resident-app/codes"
            className="text-sm font-semibold text-brand-navy hover:underline"
          >
            Back to Pass Codes
          </Link>
        </div>
      </div>
    </div>
  );
}
