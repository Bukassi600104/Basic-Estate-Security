"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Shield, Save } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { UserRecord, SubAdminPermission } from "@/lib/repos/users";

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

export default function EditSubAdminPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [subAdmin, setSubAdmin] = useState<UserRecord | null>(null);
  const [permissions, setPermissions] = useState<SubAdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSubAdmin() {
      try {
        const res = await fetch(`/api/estate-admin/sub-admins/${userId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load sub-admin");
        }

        setSubAdmin(data.subAdmin);
        setPermissions(data.subAdmin?.permissions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sub-admin");
      } finally {
        setLoading(false);
      }
    }

    fetchSubAdmin();
  }, [userId]);

  function togglePermission(perm: SubAdminPermission) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
    setSuccess(false);
  }

  function selectAll() {
    setPermissions(PERMISSIONS.map((p) => p.key));
    setSuccess(false);
  }

  function clearAll() {
    setPermissions([]);
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/estate-admin/sub-admins/${userId}/permissions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update permissions");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  if (!subAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/estate-admin/team"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">Sub-admin not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/estate-admin/team"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </Link>

      {/* Sub-admin info header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
          <Shield className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{subAdmin.name}</h1>
          <p className="text-sm text-white/50">{subAdmin.email}</p>
        </div>
      </div>

      {/* Permissions section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Permissions</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Select All
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-white/50 hover:underline"
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
                  ? "border-violet-700 bg-violet-700/5"
                  : "border-white/10 bg-white/5 hover:border-white/15"
              }`}
            >
              <div className="pt-0.5">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                    permissions.includes(perm.key)
                      ? "border-violet-700 bg-violet-700"
                      : "border-white/15"
                  }`}
                >
                  {permissions.includes(perm.key) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{perm.label}</p>
                <p className="mt-0.5 text-xs text-white/50">{perm.description}</p>
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

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4 text-sm text-emerald-700">
            Permissions updated successfully!
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href="/estate-admin/team"
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/5"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:shadow-emerald-500/30 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Spinner className="text-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
