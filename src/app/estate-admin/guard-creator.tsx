"use client";

import { useState } from "react";
import { ClipboardCopy, Shield, UserRoundPlus } from "lucide-react";

export function GuardCreator() {
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<null | {
    name: string;
    identifier: string;
    password: string;
    verificationCode: string;
  }>(null);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
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
      setName("");
      setIdentifier("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create guard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-tight text-slate-900">Create guard account</div>
          <div className="mt-1 text-sm text-slate-600">
            Guards sign in with email or phone.
          </div>
        </div>
      </div>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Name</span>
          <input
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Email or phone</span>
          <input
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </label>

        <div className="md:col-span-2">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            <UserRoundPlus className="h-4 w-4" />
            {loading ? "Creating…" : "Create guard"}
          </button>
        </div>
      </form>

      {created ? (
        <div className="mt-6 grid gap-4">
          {/* Estate Verification Code - Required for login */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm font-semibold text-blue-900">Estate Verification Code</div>
            <p className="mt-1 text-xs text-blue-700">
              Guards need this code to sign in to their portal.
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-3 py-2">
              <div className="text-lg font-mono font-bold text-blue-900">{created.verificationCode}</div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => copy(created.verificationCode)}
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-extrabold text-slate-900">Guard credentials</div>
            <div className="mt-2 text-sm text-slate-700">
              <span className="font-extrabold">{created.name}</span> — {created.identifier}
            </div>
            <div className="mt-3 grid gap-2">
              <div className="text-xs font-semibold text-slate-600 uppercase">Password</div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-sm font-mono font-extrabold text-slate-900">{created.password}</div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
                  onClick={() => copy(created.password)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
