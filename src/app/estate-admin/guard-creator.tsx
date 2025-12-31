"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, Shield, Trash2, UserRoundPlus, X } from "lucide-react";

type Guard = {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  verificationCode?: string;
  createdAt: string;
};

type CreatedGuard = {
  name: string;
  identifier: string;
  password: string;
  verificationCode: string;
};

export function GuardCreator() {
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedGuard | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loadingGuards, setLoadingGuards] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteGuard, setDeleteGuard] = useState<Guard | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadGuards() {
    try {
      const res = await fetch("/api/estate-admin/guards");
      if (res.ok) {
        const data = await res.json();
        setGuards(data.guards || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingGuards(false);
    }
  }

  useEffect(() => {
    loadGuards();
  }, []);

  async function copy(text: string, id?: string) {
    await navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function handleDelete() {
    if (!deleteGuard) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/estate-admin/guards/${deleteGuard.userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete guard");
      }
      setDeleteGuard(null);
      loadGuards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete guard");
    } finally {
      setDeleting(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/estate-admin/guards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create guard");
      setCreated(data.credentials);
      setShowModal(true);
      setName("");
      setIdentifier("");
      // Reload guards list
      loadGuards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create guard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteGuard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Guard</h3>
                <p className="text-sm text-slate-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">{deleteGuard.name}</div>
              <div className="text-sm text-slate-600">
                {deleteGuard.email || deleteGuard.phone || "No contact info"}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteGuard(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Guard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for newly created guard */}
      {showModal && created && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Guard Created!</h3>
                  <p className="text-sm text-slate-600">Save these credentials now</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Verification Code - Prominent */}
              <div className="rounded-xl border-2 border-brand-green bg-brand-green/5 p-4">
                <div className="text-sm font-bold text-brand-navy">Estate Verification Code</div>
                <p className="mt-1 text-xs text-slate-600">
                  Guards need this code to sign in to their portal
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-brand-green/30 bg-white px-4 py-3">
                  <div className="text-2xl font-mono font-bold text-brand-navy">
                    {created.verificationCode}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white hover:bg-brand-green/90"
                    onClick={() => copy(created.verificationCode)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Guard Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">{created.name}</div>
                <div className="mt-1 text-sm text-slate-600">{created.identifier}</div>

                <div className="mt-4 grid gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">Password</div>
                    <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {created.password}
                      </span>
                      <button
                        type="button"
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        onClick={() => copy(created.password)}
                      >
                        <ClipboardCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-slate-500">
                This password will not be shown again. Make sure to save it securely.
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Create Guard Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Guard Account</h2>
              <p className="mt-1 text-sm text-slate-600">
                Guards sign in with their phone number and verification code.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">Name</span>
              <input
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-700">Phone Number</span>
              <input
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+234XXXXXXXXXX"
                required
              />
            </label>

            {error && (
              <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 text-sm font-bold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-60"
              >
                <UserRoundPlus className="h-4 w-4" />
                {loading ? "Creating..." : "Create Guard"}
              </button>
            </div>
          </form>
        </div>

        {/* Guards Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registered Guards</h2>
              <p className="text-sm text-slate-600">
                All guards for this estate with their verification codes
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {guards.length} guards
            </span>
          </div>

          <div className="mt-6 overflow-x-auto">
            {loadingGuards ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : guards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Shield className="h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm font-medium">No guards registered yet</p>
                <p className="text-xs">Create your first guard above</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Name
                    </th>
                    <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Contact
                    </th>
                    <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Verification Code
                    </th>
                    <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Created
                    </th>
                    <th className="py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guards.map((guard) => (
                    <tr key={guard.userId} className="border-b border-slate-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/10">
                            <Shield className="h-4 w-4 text-brand-navy" />
                          </div>
                          <span className="font-semibold text-slate-900">{guard.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {guard.email || guard.phone || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {guard.verificationCode ? (
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-brand-green/10 px-2 py-1 font-mono text-sm font-bold text-brand-navy">
                              {guard.verificationCode}
                            </code>
                            <button
                              onClick={() => copy(guard.verificationCode!, guard.userId)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                              title="Copy code"
                            >
                              {copiedId === guard.userId ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <ClipboardCopy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {new Date(guard.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => setDeleteGuard(guard)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete guard"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
