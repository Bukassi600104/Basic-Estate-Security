"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ClipboardCopy, Key, Loader2, RefreshCcw, ShieldCheck, User } from "lucide-react";

type ResetRequest = {
  residentId: string;
  name: string;
  houseNumber: string;
  phone?: string;
  requestedAt: string;
};

type NewCredential = {
  userId: string;
  email: string;
  password: string;
  role: string;
};

type ProcessedResult = {
  resident: {
    name: string;
    houseNumber: string;
    phone?: string;
  };
  credentials: NewCredential[];
};

export default function CredentialResetsPage() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/credential-resets");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load requests");
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function processRequest(residentId: string) {
    if (processing) return;
    setProcessing(residentId);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/estate-admin/credential-resets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ residentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to process request");

      setResult({
        resident: data.resident,
        credentials: data.credentials,
      });

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.residentId !== residentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setProcessing(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/estate-admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Credential Reset Requests</h1>
            <p className="mt-1 text-sm text-slate-600">Generate new passwords for residents who forgot theirs</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Result Card - New Credentials */}
      {result && (
        <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-green-900">New Credentials Generated</h2>
              <p className="text-sm text-green-700">
                {result.resident.name} (Unit {result.resident.houseNumber})
              </p>
            </div>
            <button
              onClick={() => setResult(null)}
              className="ml-auto text-sm font-semibold text-green-700 hover:text-green-900"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {result.credentials.map((cred) => (
              <div key={cred.userId} className="rounded-xl border border-green-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <User className="h-4 w-4" />
                  {cred.role === "RESIDENT" ? "Resident" : "Delegate"}
                </div>
                <div className="mt-3 grid gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">Username</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm">{cred.email}</code>
                      <button onClick={() => copy(cred.email)} className="text-slate-400 hover:text-slate-600">
                        <ClipboardCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-500">New Password</div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="rounded bg-green-100 px-2 py-1 font-mono text-lg font-bold text-green-800">
                        {cred.password}
                      </code>
                      <button onClick={() => copy(cred.password)} className="text-slate-400 hover:text-slate-600">
                        <ClipboardCopy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-green-700">
            Share these credentials securely with the resident. The password is shown only once.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Requests List */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h2 className="font-bold text-slate-900">Pending Requests</h2>

        {loading ? (
          <div className="mt-4 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-6 py-12 text-center">
            <Key className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-600">No pending requests</p>
            <p className="mt-1 text-sm text-slate-500">
              When residents request password resets, they will appear here
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {requests.map((req) => (
              <div
                key={req.residentId}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{req.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Unit {req.houseNumber}
                    {req.phone && ` • ${req.phone}`}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Requested: {formatDate(req.requestedAt)}
                  </div>
                </div>
                <button
                  onClick={() => processRequest(req.residentId)}
                  disabled={processing === req.residentId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-bold text-white hover:bg-brand-navy/90 disabled:opacity-60"
                >
                  {processing === req.residentId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Generate New Password
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
