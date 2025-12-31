"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCopy, UserPlus, Users } from "lucide-react";

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
  const [step, setStep] = useState<1 | 2>(1);
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

  function canProceed() {
    return (
      residentName.trim().length > 0 &&
      houseNumber.trim().length > 0 &&
      residentPhone.trim().length > 0
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-2xl px-5 py-6">
        {/* Header */}
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

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-navy text-white shadow-sm">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Onboard Resident</h1>
              <p className="mt-1 text-sm text-slate-600">
                {step === 1
                  ? "Enter resident details"
                  : "Add optional approved numbers"}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <div
              className={`h-2 w-2 rounded-full ${step === 1 ? "bg-brand-navy" : "bg-slate-300"}`}
            />
            <span className={step === 1 ? "text-brand-navy" : ""}>Details</span>
            <div className="mx-2 h-px w-8 bg-slate-200" />
            <div
              className={`h-2 w-2 rounded-full ${step === 2 ? "bg-brand-navy" : "bg-slate-300"}`}
            />
            <span className={step === 2 ? "text-brand-navy" : ""}>Delegates</span>
          </div>

          <form className="mt-6" onSubmit={onSubmit}>
            {step === 1 ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Resident name</span>
                    <input
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={residentName}
                      onChange={(e) => setResidentName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">House number</span>
                    <input
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="A-101"
                      required
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Phone number</span>
                    <input
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={residentPhone}
                      onChange={(e) => setResidentPhone(e.target.value)}
                      placeholder="+234..."
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Email (optional)</span>
                    <input
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                      value={residentEmail}
                      onChange={(e) => setResidentEmail(e.target.value)}
                      type="email"
                      placeholder="john@example.com"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-60"
                  onClick={() => canProceed() && setStep(2)}
                  disabled={!canProceed()}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4" />
                    Approved Numbers (Optional)
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    These numbers can generate codes on behalf of the resident
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-slate-600">Approved #1</span>
                      <input
                        placeholder="+234..."
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={d1Phone}
                        onChange={(e) => setD1Phone(e.target.value)}
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-slate-600">Approved #2</span>
                      <input
                        placeholder="+234..."
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                        value={d2Phone}
                        onChange={(e) => setD2Phone(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 h-12 items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-navy/90 disabled:opacity-60"
                  >
                    {loading ? "Creating..." : "Onboard Resident"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Credentials Card */}
        {credentials ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Login Credentials</h2>
            <p className="mt-1 text-sm text-slate-600">
              Copy and share these securely. Passwords are shown only once.
            </p>

            <div className="mt-4 grid gap-3">
              {/* Estate Verification Code */}
              <div className="rounded-2xl border-2 border-brand-green bg-brand-green/5 p-4">
                <div className="text-sm font-bold text-brand-navy">Estate Verification Code</div>
                <p className="mt-1 text-xs text-slate-600">
                  All residents and delegates need this code to sign in.
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand-green/30 bg-white px-4 py-3">
                  <div className="text-2xl font-mono font-bold text-brand-navy">
                    {credentials.verificationCode}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white hover:bg-brand-green/90"
                    onClick={() => copy(credentials.verificationCode)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>

              {/* Resident Credentials */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Resident</div>
                <div className="mt-2 text-sm text-slate-700">
                  {credentials.resident.name} • {credentials.resident.phone}
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="text-xs font-bold uppercase text-slate-500">Login Username</div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-sm font-mono break-all">{credentials.resident.username}</div>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => copy(credentials.resident.username)}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-500">Password</div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-sm font-mono">{credentials.resident.password}</div>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => copy(credentials.resident.password)}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Delegates */}
              {credentials.delegates.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">Approved Numbers (Delegates)</div>
                  <div className="mt-3 grid gap-3">
                    {credentials.delegates.map((d) => (
                      <div key={d.phone} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-sm font-semibold text-slate-900">{d.phone}</div>
                        <div className="mt-2 grid gap-2">
                          <div className="text-xs font-bold uppercase text-slate-500">Username</div>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-sm font-mono break-all">{d.username}</div>
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                              onClick={() => copy(d.username)}
                            >
                              <ClipboardCopy className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-xs font-bold uppercase text-slate-500">Password</div>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-sm font-mono">{d.password}</div>
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                              onClick={() => copy(d.password)}
                            >
                              <ClipboardCopy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
