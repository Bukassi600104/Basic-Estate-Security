"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, Loader2, Phone, ShieldCheck, UserPlus, Users, X } from "lucide-react";

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

type ApprovedNumber = {
  phone: string;
  status: "approved";
};

// Nigerian phone number validation
// Valid formats: 11 digits starting with valid network prefixes
function isValidNigerianPhone(phone: string): { valid: boolean; error?: string } {
  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s-]/g, "");

  // Check length
  if (cleaned.length !== 11) {
    return { valid: false, error: "Phone number must be 11 digits" };
  }

  // Check if all digits
  if (!/^\d{11}$/.test(cleaned)) {
    return { valid: false, error: "Phone number must contain only digits" };
  }

  // Valid Nigerian prefixes (MTN, Glo, Airtel, 9mobile, etc.)
  const validPrefixes = [
    "0701", "0702", "0703", "0704", "0705", "0706", "0707", "0708", "0709",
    "0802", "0803", "0804", "0805", "0806", "0807", "0808", "0809", "0810",
    "0811", "0812", "0813", "0814", "0815", "0816", "0817", "0818", "0819",
    "0901", "0902", "0903", "0904", "0905", "0906", "0907", "0908", "0909",
    "0911", "0912", "0913", "0914", "0915", "0916",
  ];

  const prefix = cleaned.substring(0, 4);
  if (!validPrefixes.includes(prefix)) {
    return { valid: false, error: "Invalid Nigerian phone prefix. Use format: 0803XXXXXXX" };
  }

  return { valid: true };
}

// Convert local format to international
function toInternationalFormat(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "+234" + cleaned.substring(1);
  }
  return phone;
}

export default function OnboardResidentPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [residentName, setResidentName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [residentPhone, setResidentPhone] = useState("");
  const [residentEmail, setResidentEmail] = useState("");

  // Approved numbers
  const [approvedNumbers, setApprovedNumbers] = useState<ApprovedNumber[]>([]);
  const [newApprovalPhone, setNewApprovalPhone] = useState("");

  // Approval animation state
  const [approvalState, setApprovalState] = useState<"idle" | "processing" | "validating" | "approved" | "error">("idle");
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  // Animated approval process
  async function handleApproveNumber() {
    const phone = newApprovalPhone.trim();

    if (!phone) {
      setApprovalError("Please enter a phone number");
      return;
    }

    // Check max 2 numbers
    if (approvedNumbers.length >= 2) {
      setApprovalError("Maximum of 2 approved numbers allowed");
      return;
    }

    // Validate Nigerian format
    const validation = isValidNigerianPhone(phone);
    if (!validation.valid) {
      setApprovalError(validation.error || "Invalid phone number");
      return;
    }

    // Check for duplicates
    const intlFormat = toInternationalFormat(phone);
    if (approvedNumbers.some(n => toInternationalFormat(n.phone) === intlFormat)) {
      setApprovalError("This number is already approved");
      return;
    }

    // Start animated approval flow
    setApprovalError(null);
    setApprovalState("processing");

    await new Promise(r => setTimeout(r, 800));
    setApprovalState("validating");

    await new Promise(r => setTimeout(r, 1200));
    setApprovalState("approved");

    // Add to approved list
    setApprovedNumbers(prev => [...prev, { phone, status: "approved" }]);

    await new Promise(r => setTimeout(r, 600));
    setApprovalState("idle");
    setNewApprovalPhone("");
  }

  function removeApprovedNumber(phone: string) {
    setApprovedNumbers(prev => prev.filter(n => n.phone !== phone));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCredentials(null);
    setLoading(true);

    try {
      // Convert phones to international format
      const approvedPhone1 = approvedNumbers[0] ? toInternationalFormat(approvedNumbers[0].phone) : undefined;
      const approvedPhone2 = approvedNumbers[1] ? toInternationalFormat(approvedNumbers[1].phone) : undefined;

      const res = await fetch("/api/estate-admin/residents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          residentName,
          houseNumber,
          residentPhone: toInternationalFormat(residentPhone),
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
    const phoneValid = isValidNigerianPhone(residentPhone.trim()).valid;
    return (
      residentName.trim().length > 0 &&
      houseNumber.trim().length > 0 &&
      phoneValid
    );
  }

  function canOnboard() {
    return approvedNumbers.length >= 1;
  }

  const residentPhoneValidation = residentPhone.trim() ? isValidNigerianPhone(residentPhone.trim()) : null;

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
                  : "Approve phone numbers for code generation"}
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
            <span className={step === 2 ? "text-brand-navy" : ""}>Approve Numbers</span>
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
                      className={`h-12 rounded-xl border bg-white px-4 text-base font-medium text-slate-900 outline-none focus:ring-4 ${
                        residentPhoneValidation && !residentPhoneValidation.valid
                          ? "border-rose-300 ring-rose-100 focus:border-rose-500"
                          : "border-slate-200 ring-brand-navy/20 focus:border-brand-navy"
                      }`}
                      value={residentPhone}
                      onChange={(e) => setResidentPhone(e.target.value)}
                      placeholder="08031234567"
                      inputMode="tel"
                      required
                    />
                    {residentPhoneValidation && !residentPhoneValidation.valid && (
                      <span className="text-xs font-medium text-rose-600">
                        {residentPhoneValidation.error}
                      </span>
                    )}
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
                {/* Approved Numbers Section */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4" />
                    Approved Numbers
                    <span className="ml-auto rounded-full bg-brand-navy px-2 py-0.5 text-xs font-bold text-white">
                      Required
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    At least 1 number must be approved. These numbers can generate access codes.
                  </p>

                  {/* List of approved numbers */}
                  {approvedNumbers.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      {approvedNumbers.map((num) => (
                        <div
                          key={num.phone}
                          className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                              <Check className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{num.phone}</div>
                              <div className="text-xs font-medium text-green-600">Approved</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeApprovedNumber(num.phone)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new number - only show if less than 2 approved */}
                  {approvedNumbers.length < 2 && (
                    <div className="mt-4">
                      <div className="grid gap-3 sm:flex">
                        <div className="relative flex-1">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            placeholder="08031234567"
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-base font-medium text-slate-900 outline-none ring-brand-navy/20 focus:border-brand-navy focus:ring-4"
                            value={newApprovalPhone}
                            onChange={(e) => {
                              setNewApprovalPhone(e.target.value);
                              setApprovalError(null);
                            }}
                            disabled={approvalState !== "idle"}
                            inputMode="tel"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApproveNumber}
                          disabled={approvalState !== "idle" || !newApprovalPhone.trim()}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60 sm:w-auto"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Approve Number
                        </button>
                      </div>

                      {approvalError && (
                        <div className="mt-2 text-xs font-medium text-rose-600">
                          {approvalError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Animated approval message box */}
                  {approvalState !== "idle" && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center gap-3 px-4 py-3">
                        {approvalState === "processing" && (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-brand-navy" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-slate-900">
                                <span className="inline-flex items-center gap-1">
                                  Processing
                                  <span className="inline-flex gap-0.5">
                                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                                  </span>
                                </span>
                              </div>
                              <div className="h-1.5 mt-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full w-1/3 rounded-full bg-brand-navy animate-pulse" />
                              </div>
                            </div>
                          </>
                        )}
                        {approvalState === "validating" && (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-slate-900">
                                <span className="inline-flex items-center gap-1">
                                  Please wait, validating number
                                  <span className="inline-flex gap-0.5">
                                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                                  </span>
                                </span>
                              </div>
                              <div className="h-1.5 mt-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full w-2/3 rounded-full bg-amber-500 animate-pulse" />
                              </div>
                            </div>
                          </>
                        )}
                        {approvalState === "approved" && (
                          <>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                              <Check className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold text-green-600">
                                Approved!
                              </div>
                              <div className="h-1.5 mt-2 w-full rounded-full bg-green-100 overflow-hidden">
                                <div className="h-full w-full rounded-full bg-green-500" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status message */}
                  {approvedNumbers.length === 0 && approvalState === "idle" && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                      You must approve at least 1 phone number before onboarding this resident.
                    </div>
                  )}

                  {approvedNumbers.length === 2 && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-medium text-slate-600">
                      Maximum of 2 numbers reached.
                    </div>
                  )}
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
                    disabled={loading || !canOnboard()}
                    className={`flex flex-1 h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition-all ${
                      canOnboard()
                        ? "bg-brand-navy text-white hover:bg-brand-navy/90"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    } disabled:opacity-60`}
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
