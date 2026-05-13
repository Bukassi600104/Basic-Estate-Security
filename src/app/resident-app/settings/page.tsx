"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, Key, Loader2, Lock, RefreshCcw, ShieldCheck, AlertTriangle } from "lucide-react";

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

  // Reset request state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleResetRequest() {
    if (resetLoading || resetSuccess) return;
    setResetError(null);
    setResetLoading(true);

    try {
      const res = await fetch("/api/resident/request-reset", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to submit request");
      setResetSuccess(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setResetLoading(false);
    }
  }

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

  function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
      <div className={`flex items-center gap-2 text-xs ${met ? "text-emerald-400" : "text-white/50"}`}>
        {met ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border border-white/15" />
        )}
        {text}
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Link
            href="/resident-app/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Settings
            </h1>
            <p className="text-sm text-white/60">Manage your account</p>
          </div>
        </header>

        {/* Change Password Card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-brand-green to-brand-green-600 text-white">
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
            {/* Current Password */}
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
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {/* New Password */}
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
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword.length > 0 && (
                <div className="mt-2 grid gap-1.5 rounded-xl border border-white/5 bg-white/5 p-3">
                  <p className="text-xs font-semibold text-white/70">Password requirements:</p>
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
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
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
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-brand-green/40 disabled:opacity-60"
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

        {/* Phone Number Notice */}
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div>
              <h3 className="font-bold text-amber-200">Phone Number Changes</h3>
              <p className="mt-1 text-sm text-amber-300">
                To change your registered phone number or approved delegate numbers,
                please contact your estate administrator. Phone number changes cannot
                be made from this app for security purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Forgot Password - Request Reset */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-white">Forgot Password?</h2>
              <p className="text-sm text-white/60">Request new credentials from your estate admin</p>
            </div>
          </div>

          {resetSuccess ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-300">Request submitted!</p>
                <p className="text-sm text-emerald-400">Your estate admin will contact you with new credentials.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-white/60">
                If you&apos;ve forgotten your password and can&apos;t change it above, you can request
                your estate admin to generate new login credentials for you.
              </p>

              {resetError && (
                <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
                  {resetError}
                </div>
              )}

              <button
                type="button"
                onClick={handleResetRequest}
                disabled={resetLoading}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-white/5 text-sm font-bold text-amber-400 transition-all hover:bg-amber-500/10 disabled:opacity-60"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Request Credential Reset
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/resident-app/profile"
            className="text-sm font-semibold text-brand-green hover:underline"
          >
            Back to Pass Codes
          </Link>
        </div>
      </div>
    </div>
  );
}
