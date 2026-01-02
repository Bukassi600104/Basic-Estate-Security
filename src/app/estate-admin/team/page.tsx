"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Shield,
  MoreVertical,
  Trash2,
  Settings,
  AlertCircle,
  Lock,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { UserRecord, SubAdminPermission } from "@/lib/repos/users";

const PERMISSION_LABELS: Record<SubAdminPermission, string> = {
  MANAGE_RESIDENTS: "Manage Residents",
  MANAGE_GUARDS: "Manage Guards",
  VIEW_LOGS: "View Logs",
  EXPORT_DATA: "Export Data",
  MANAGE_GATES: "Manage Gates",
  VIEW_ANALYTICS: "View Analytics",
};

export default function TeamPage() {
  const [subAdmins, setSubAdmins] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canAddMore, setCanAddMore] = useState(false);
  const [maxAdmins, setMaxAdmins] = useState(1);
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  async function fetchSubAdmins() {
    try {
      const res = await fetch("/api/estate-admin/sub-admins");
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.upgradeRequired) {
          setFeatureEnabled(false);
          setError(data.error);
        } else {
          throw new Error(data.error ?? "Failed to load team");
        }
        return;
      }

      setFeatureEnabled(true);
      setSubAdmins(data.subAdmins ?? []);
      setCanAddMore(data.canAddMore ?? false);
      setMaxAdmins(data.maxAdmins ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to remove this sub-admin?")) return;

    try {
      const res = await fetch(`/api/estate-admin/sub-admins/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove sub-admin");
      }

      setSubAdmins((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove sub-admin");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-navy" />
      </div>
    );
  }

  // Feature not enabled - show upgrade prompt
  if (!featureEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/estate-admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Team Management
          </h1>
          <p className="mt-3 text-slate-600">
            Sub-admin accounts are available on Standard and Premium plans.
            Upgrade your plan to add team members with customizable permissions.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white hover:bg-brand-navy-700"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/estate-admin"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage sub-admin accounts and their permissions.
          </p>
        </div>

        {canAddMore ? (
          <Link
            href="/estate-admin/team/create"
            className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-navy-700"
          >
            <UserPlus className="h-4 w-4" />
            Add Sub-Admin
          </Link>
        ) : (
          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <AlertCircle className="h-3 w-3" />
              Limit reached ({maxAdmins} admins)
            </span>
            <p className="mt-1 text-xs text-slate-500">
              <Link href="/pricing" className="underline hover:text-brand-navy">
                Upgrade
              </Link>{" "}
              for more
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {subAdmins.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No sub-admins yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Add team members to help manage your estate.
          </p>
          {canAddMore && (
            <Link
              href="/estate-admin/team/create"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-navy-700"
            >
              <UserPlus className="h-4 w-4" />
              Add Your First Sub-Admin
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {subAdmins.map((admin) => (
            <div
              key={admin.userId}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{admin.name}</h3>
                    <p className="text-sm text-slate-500">{admin.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/estate-admin/team/${admin.userId}`}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Edit permissions"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(admin.userId)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove sub-admin"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {admin.permissions?.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green-700"
                  >
                    {PERMISSION_LABELS[perm]}
                  </span>
                ))}
                {(!admin.permissions || admin.permissions.length === 0) && (
                  <span className="text-xs text-slate-400">No permissions assigned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
