"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Check, Eye, EyeOff, Key, Loader2, Lock, ShieldCheck } from "lucide-react";

type EstateStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";

type Estate = {
  id: string;
  name: string;
  address: string | null;
  status: EstateStatus;
};

export default function EstateSettingsPage() {
  const [estate, setEstate] = useState<Estate | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/estate");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load estate");
      setEstate(data.estate);
      setAddress(data.estate?.address ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load estate");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(partial: Partial<{ status: EstateStatus; address: string }>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/estate", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(partial),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update estate");
      setEstate(data.estate);
      setAddress(data.estate?.address ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update estate");
    } finally {
      setSaving(false);
    }
  }

  const pwHasLength = newPassword.length >= 8;
  const pwHasUpper = /[A-Z]/.test(newPassword);
  const pwHasLower = /[a-z]/.test(newPassword);
  const pwHasDigit = /[0-9]/.test(newPassword);
  const pwHasSpecial = /[!@#$%^&*]/.test(newPassword);
  const pwMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const pwValid = pwHasLength && pwHasUpper && pwHasLower && pwHasDigit && pwHasSpecial;
  const canSubmitPw = currentPassword.length > 0 && pwValid && pwMatch && !pwLoading;

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitPw) return;
    setPwError(null);
    setPwSuccess(false);
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to change password");
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  }

  function PwReq({ met, text }: { met: boolean; text: string }) {
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
          <p className="text-sm text-white/60">Manage estate status and basic details.</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-white/60">
            <Spinner className="text-white/50" />
            Loading…
          </div>
        ) : estate ? (
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">Estate</div>
              <div className="mt-2 text-sm text-white/70">
                <div>
                  <span className="font-semibold">Name:</span> {estate.name}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Status:</span> {estate.status}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">Address</div>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Estate address"
                  className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none ring-brand-green/20 focus:ring-4"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save({ address })}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Spinner className="text-white" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white">Estate status</div>
              <p className="mt-1 text-sm text-white/60">
                Suspended estates block all resident and security portal access. Terminated is permanent.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {estate.status !== "ACTIVE" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save({ status: "ACTIVE" })}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save({ status: "SUSPENDED" })}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 text-xs font-extrabold text-rose-300 hover:bg-rose-500/150/15 disabled:opacity-60"
                  >
                    Suspend
                  </button>
                )}

                {estate.status !== "TERMINATED" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!confirm("Terminate estate? This blocks all access permanently.")) return;
                      save({ status: "TERMINATED" });
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-extrabold text-white hover:bg-white/5 disabled:opacity-60"
                  >
                    Terminate
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm text-white/60">Estate not found.</div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-white">Change Password</h2>
            <p className="text-sm text-white/60">Update your login password</p>
          </div>
        </div>

        {pwSuccess && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-300">Password changed successfully!</p>
              <p className="text-sm text-emerald-400">Your new password is now active.</p>
            </div>
          </div>
        )}

        {pwError && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
            {pwError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-white/70">Current Password</span>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-11 text-base font-medium text-white outline-none ring-brand-green/20 focus:border-brand-green/50 focus:ring-4" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-white/70">New Password</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-11 text-base font-medium text-white outline-none ring-brand-green/20 focus:border-brand-green/50 focus:ring-4" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="mt-2 grid gap-1.5 rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-xs font-semibold text-white/70">Password requirements:</p>
                <PwReq met={pwHasLength} text="At least 8 characters" />
                <PwReq met={pwHasUpper} text="Uppercase letter (A-Z)" />
                <PwReq met={pwHasLower} text="Lowercase letter (a-z)" />
                <PwReq met={pwHasDigit} text="Number (0-9)" />
                <PwReq met={pwHasSpecial} text="Special character (!@#$%^&*)" />
              </div>
            )}
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-white/70">Confirm New Password</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className={`h-12 w-full rounded-xl border bg-white/5 pl-11 pr-11 text-base font-medium text-white outline-none focus:ring-4 ${confirmPassword.length > 0 && !pwMatch ? "border-rose-300 ring-rose-100 focus:border-rose-500" : "border-white/10 ring-brand-green/20 focus:border-brand-green/50"}`} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !pwMatch && (
              <span className="text-xs font-medium text-rose-400">Passwords do not match</span>
            )}
          </label>

          <button type="submit" disabled={!canSubmitPw} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-60">
            {pwLoading ? (
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
  );
}
