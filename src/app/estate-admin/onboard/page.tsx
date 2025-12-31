"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCopy, UserPlus } from "lucide-react";

type Credentials = {
  resident: {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    verificationCode: string;
  };
  delegates: Array<{ phone: string; password: string; username: string }>;
  verificationCode: string;
};

export default function OnboardResidentPage() {
  const [residentName, setResidentName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [residentPhone, setResidentPhone] = useState("");
  const [residentEmail, setResidentEmail] = useState("");

  const [d1Phone, setD1Phone] = useState("");
  const [d2Phone, setD2Phone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCredentials(null);
    setLoading(true);

    try {
      const approvedPhone1 = d1Phone || undefined;
      const approvedPhone2 = d2Phone || undefined;

      const res = await fetch("/api/estate-admin/residents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          residentName,
          houseNumber,
          residentPhone,
          residentEmail,
          approvedPhone1,
          approvedPhone2,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to onboard resident");

      setCredentials(data.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to onboard resident");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/estate-admin"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <Link
          href="/estate-admin/logs"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Logs
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Onboard resident</h1>
            <p className="mt-1 text-sm text-slate-600">
              Add a resident and (optionally) up to two approved code-generator numbers.
            </p>
          </div>
        </div>

        <form className="mt-6 grid gap-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-800">Resident name</span>
              <input
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none ring-slate-900 focus:ring-2"
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-800">House number</span>
              <input
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none ring-slate-900 focus:ring-2"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-800">Resident phone</span>
              <input
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none ring-slate-900 focus:ring-2"
                value={residentPhone}
                onChange={(e) => setResidentPhone(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-800">Resident email (optional)</span>
              <input
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none ring-slate-900 focus:ring-2"
                value={residentEmail}
                onChange={(e) => setResidentEmail(e.target.value)}
                type="email"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Approved number 1</div>
              <div className="mt-3 grid gap-3">
                <input
                  placeholder="Phone"
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none ring-slate-900 focus:ring-2"
                  value={d1Phone}
                  onChange={(e) => setD1Phone(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Approved number 2</div>
              <div className="mt-3 grid gap-3">
                <input
                  placeholder="Phone"
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none ring-slate-900 focus:ring-2"
                  value={d2Phone}
                  onChange={(e) => setD2Phone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-slate-50 hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Onboarding…" : "Onboard resident"}
          </button>
        </form>
      </div>

      {credentials ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Login credentials</h2>
          <p className="mt-1 text-sm text-slate-600">
            Copy and share these securely. Passwords are shown only once.
          </p>

          <div className="mt-4 grid gap-3">
            {/* Estate Verification Code - Required for login */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-900">Estate Verification Code</div>
              <p className="mt-1 text-xs text-blue-700">
                All residents and delegates need this code to sign in to the portal.
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-3 py-2">
                <div className="text-lg font-mono font-bold text-blue-900">{credentials.verificationCode}</div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => copy(credentials.verificationCode)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold">Resident</div>
              <div className="mt-2 text-sm text-slate-700">
                {credentials.resident.name} • {credentials.resident.phone}
              </div>
              <div className="mt-3 grid gap-2">
                <div className="text-xs font-semibold text-slate-600 uppercase">Login Username</div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-sm font-mono break-all">{credentials.resident.username}</div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                    onClick={() => copy(credentials.resident.username)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <div className="text-xs font-semibold text-slate-600 uppercase">Password</div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-sm font-mono">{credentials.resident.password}</div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                    onClick={() => copy(credentials.resident.password)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {credentials.delegates.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold">Approved numbers (Delegates)</div>
                <div className="mt-3 grid gap-3">
                  {credentials.delegates.map((d) => (
                    <div key={d.phone} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-sm font-semibold text-slate-900">{d.phone}</div>
                      <div className="mt-2 grid gap-2">
                        <div className="text-xs font-semibold text-slate-600 uppercase">Login Username</div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-sm font-mono break-all">{d.username}</div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                            onClick={() => copy(d.username)}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 uppercase">Password</div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="text-sm font-mono">{d.password}</div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                            onClick={() => copy(d.password)}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
