"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

type ResidentProfile = {
  verificationCode?: string | null;
  estate?: string;
  estateName?: string;
};

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
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const res = await fetch("/api/resident/profile");
        const data = await res.json().catch(() => ({}));
        if (mounted && res.ok) {
          setProfile(data.profile ?? null);
        }
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

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

  async function copyVerificationCode() {
    const code = profile?.verificationCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1800);
  }

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
      <div className={`flex items-center gap-2 text-xs ${met ? "text-emerald-700" : "text-slate-500"}`}>
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
    <div className="pb-8 text-slate-950">
      <div className="mx-auto max-w-lg px-5 py-6">
        <header className="flex items-center gap-4">
          <Link
            href="/resident-app/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-white text-slate-600 shadow-sm hover:bg-violet-50 hover:text-violet-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">Settings</h1>
            <p className="text-sm text-slate-500">Manage your account</p>
          </div>
        </header>

        <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Resident verification code
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Keep this code for resident sign-in and account checks.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-700 text-white">
              <Key className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-violet-50 p-4">
            <code className="min-w-0 flex-1 break-all font-mono text-2xl font-extrabold tracking-[0.18em] text-slate-950">
              {profileLoading ? "Loading..." : profile?.verificationCode || "Not available"}
            </code>
            <button
              type="button"
              onClick={copyVerificationCode}
              disabled={!profile?.verificationCode}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 transition-colors hover:bg-violet-700 hover:text-white disabled:opacity-50"
              aria-label="Copy verification code"
            >
              {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950">Change Password</h2>
              <p className="text-sm text-slate-500">Update your login password</p>
            </div>
          </div>

          {success && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-semibold text-emerald-800">Password changed successfully!</p>
                <p className="text-sm text-emerald-700">Your new password is now active.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <PasswordField
              icon={<Key className="h-4 w-4" />}
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter current password"
              show={showCurrent}
              onToggle={() => setShowCurrent(!showCurrent)}
            />

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">New Password</span>
              <PasswordInput
                icon={<Lock className="h-4 w-4" />}
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password"
                show={showNew}
                onToggle={() => setShowNew(!showNew)}
              />

              {newPassword.length > 0 && (
                <div className="mt-2 grid gap-1.5 rounded-xl border border-violet-100 bg-violet-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Password requirements:</p>
                  <RequirementItem met={hasLength} text="5-8 characters" />
                  <RequirementItem met={hasUpper} text="Uppercase letter (A-Z)" />
                  <RequirementItem met={hasLower} text="Lowercase letter (a-z)" />
                  <RequirementItem met={hasDigit} text="Number (0-9)" />
                  <RequirementItem met={hasSpecial} text="Special character (!@#$%^&*)" />
                </div>
              )}
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">Confirm New Password</span>
              <PasswordInput
                icon={<Lock className="h-4 w-4" />}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                show={showConfirm}
                onToggle={() => setShowConfirm(!showConfirm)}
                invalid={confirmPassword.length > 0 && !passwordsMatch}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <span className="text-xs font-medium text-rose-600">Passwords do not match</span>
              )}
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-800 disabled:opacity-60"
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

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="font-bold text-amber-900">Phone Number Changes</h3>
              <p className="mt-1 text-sm text-amber-800">
                To change your registered phone number or approved delegate numbers,
                please contact your estate administrator. Phone number changes cannot
                be made from this app for security purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <RefreshCcw className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950">Forgot Password?</h2>
              <p className="text-sm text-slate-500">Request new credentials from your estate admin</p>
            </div>
          </div>

          {resetSuccess ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-semibold text-emerald-800">Request submitted!</p>
                <p className="text-sm text-emerald-700">Your estate admin will contact you with new credentials.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-600">
                If you&apos;ve forgotten your password and can&apos;t change it above, you can request
                your estate admin to generate new login credentials for you.
              </p>

              {resetError && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {resetError}
                </div>
              )}

              <button
                type="button"
                onClick={handleResetRequest}
                disabled={resetLoading}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-white text-sm font-bold text-amber-700 transition-all hover:bg-amber-50 disabled:opacity-60"
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
      </div>
    </div>
  );
}

function PasswordField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <PasswordInput
        icon={icon}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        show={show}
        onToggle={onToggle}
      />
    </label>
  );
}

function PasswordInput({
  icon,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  invalid = false,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-12 w-full rounded-xl border bg-white pl-11 pr-11 text-base font-medium text-slate-950 outline-none focus:ring-4 ${
          invalid
            ? "border-rose-300 ring-rose-100 focus:border-rose-500"
            : "border-slate-200 ring-violet-600/20 focus:border-violet-500"
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-700"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
