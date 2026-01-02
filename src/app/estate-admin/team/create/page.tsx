"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, User, Shield, Check } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { SubAdminPermission } from "@/lib/repos/users";

const PERMISSIONS: { key: SubAdminPermission; label: string; description: string }[] = [
  {
    key: "MANAGE_RESIDENTS",
    label: "Manage Residents",
    description: "Onboard new residents and manage existing ones",
  },
  {
    key: "MANAGE_GUARDS",
    label: "Manage Guards",
    description: "Create and manage security guard accounts",
  },
  {
    key: "MANAGE_GATES",
    label: "Manage Gates",
    description: "Configure entry points and gate settings",
  },
  {
    key: "VIEW_LOGS",
    label: "View Logs",
    description: "Access validation and activity logs",
  },
  {
    key: "EXPORT_DATA",
    label: "Export Data",
    description: "Export logs and reports to Excel",
  },
  {
    key: "VIEW_ANALYTICS",
    label: "View Analytics",
    description: "Access dashboard analytics and statistics",
  },
];

export default function CreateSubAdminPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<SubAdminPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tempPassword: string } | null>(null);

  function togglePermission(perm: SubAdminPermission) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  function selectAll() {
    setPermissions(PERMISSIONS.map((p) => p.key));
  }

  function clearAll() {
    setPermissions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/estate-admin/sub-admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, permissions }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create sub-admin");
      }

      setSuccess({ tempPassword: data.tempPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sub-admin");
    } finally {
      setLoading(false);
    }
  }

  // Success state - show credentials
  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/20">
            <Check className="h-8 w-8 text-brand-green" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Sub-Admin Created!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Share these credentials with {name}. They will need to change their
            password on first login.
          </p>

          <div className="mt-6 space-y-4 rounded-xl bg-white p-4 text-left">
            <div>
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <p className="mt-1 font-mono text-sm text-slate-900">{email}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">
                Temporary Password
              </label>
              <p className="mt-1 rounded bg-slate-100 px-3 py-2 font-mono text-sm text-slate-900">
                {success.tempPassword}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-800">
            <strong>Important:</strong> This password will only be shown once.
            Make sure to copy and share it securely with the sub-admin.
          </div>

          <div className="mt-8 flex gap-3">
            <Link
              href="/estate-admin/team"
              className="flex-1 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              Back to Team
            </Link>
            <button
              onClick={() => {
                setSuccess(null);
                setName("");
                setEmail("");
                setPermissions([]);
              }}
              className="flex-1 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-navy-700"
            >
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/estate-admin/team"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Add Sub-Admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a new sub-admin account with specific permissions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
              placeholder="Enter sub-admin name"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
              placeholder="Enter email address"
              required
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            A temporary password will be generated for them to use.
          </p>
        </div>

        {/* Permissions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Permissions
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-semibold text-brand-navy hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-slate-500 hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {PERMISSIONS.map((perm) => (
              <label
                key={perm.key}
                className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                  permissions.includes(perm.key)
                    ? "border-brand-navy bg-brand-navy/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                      permissions.includes(perm.key)
                        ? "border-brand-navy bg-brand-navy"
                        : "border-slate-300"
                    }`}
                  >
                    {permissions.includes(perm.key) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{perm.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{perm.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.includes(perm.key)}
                  onChange={() => togglePermission(perm.key)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/estate-admin/team"
            className="flex-1 rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-900 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !name || !email}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-navy px-5 py-3 text-sm font-bold text-white hover:bg-brand-navy-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Spinner className="text-white" />
                Creating...
              </>
            ) : (
              <>
                Create Sub-Admin
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
