"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";

type EstateOption = {
  id: string;
  name: string;
  address?: string | null;
};

export default function ResidentVerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [estateName, setEstateName] = useState("");
  const [estateId, setEstateId] = useState("");
  const [estateOptions, setEstateOptions] = useState<EstateOption[]>([]);
  const [residentName, setResidentName] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resident-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          estateName,
          estateId,
          residentName,
          phone,
          verificationCode,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Verification failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function continueToVerification() {
    setError(null);
    if (!estateName.trim().length || !residentName.trim().length) return;

    const res = await fetch(`/api/auth/estates/lookup?name=${encodeURIComponent(estateName.trim())}`);
    const data = await res.json().catch(() => ({ estates: [] }));
    const estates = (data.estates || []) as EstateOption[];
    setEstateOptions(estates);

    if (estates.length === 0) {
      setError("Estate not found. Check the estate name or ask your estate admin.");
      return;
    }

    if (estates.length === 1) {
      setEstateId(estates[0].id);
      setStep(2);
      return;
    }

    if (estateId && estates.some((estate) => estate.id === estateId)) {
      setStep(2);
      return;
    }

    setError("Select the correct estate branch before continuing.");
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f8f7ff]">
      {/* Background — brighter image, lighter overlays */}
      <div className="absolute inset-0">
        <Image src="/images/gatepilot-hero.png" alt="" fill className="object-cover object-[95%_center]" style={{ filter: 'brightness(1.4)', opacity: 0.22 }} priority />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950 via-violet-950/88 to-violet-700/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950 via-transparent to-violet-700/70" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-200 bg-white">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wider text-white">GatePilot</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Security</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
            <Globe className="h-3.5 w-3.5" />
            EN
          </div>
        </header>

        {/* Main */}
        <div className="flex flex-1 items-center justify-center px-6 pb-10 lg:px-10">
          <div className="w-full max-w-md">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-200 bg-white">
                <User className="h-8 w-8 text-emerald-400" />
              </div>
            </div>

            <h1 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-white">
              Resident <span className="text-emerald-400">Sign-in</span>
            </h1>
            <p className="mt-2 text-center text-sm text-white/50">
              {step === 1 ? "Enter your estate and name" : "Enter your verification details"}
            </p>

            {/* Step indicator */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
              <div className={`h-2 w-2 rounded-full ${step === 1 ? "bg-violet-700" : "bg-white/20"}`} />
              <span className={step === 1 ? "text-emerald-400" : ""}>Identity</span>
              <div className="mx-2 h-px w-8 bg-white/10" />
              <div className={`h-2 w-2 rounded-full ${step === 2 ? "bg-violet-700" : "bg-white/20"}`} />
              <span className={step === 2 ? "text-emerald-400" : ""}>Verification</span>
            </div>

            <form className="mt-8" onSubmit={onSubmit}>
              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Estate name</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-4 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                        value={estateName}
                        onChange={(e) => {
                          setEstateName(e.target.value);
                          setEstateId("");
                          setEstateOptions([]);
                        }}
                        placeholder="Blue Gardens Estate"
                        required
                      />
                    </div>
                  </div>

                  {estateOptions.length > 1 && (
                    <div className="rounded-lg border border-violet-200 bg-white p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Select estate branch
                      </div>
                      <div className="grid gap-2">
                        {estateOptions.map((estate) => (
                          <button
                            type="button"
                            key={estate.id}
                            onClick={() => setEstateId(estate.id)}
                            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                              estateId === estate.id
                                ? "border-violet-400 bg-violet-700/15 text-white"
                                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                            }`}
                          >
                            <div className="font-bold">{estate.name}</div>
                            <div className="text-xs opacity-70">{estate.address || estate.id}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Your name</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-4 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                        value={residentName}
                        onChange={(e) => setResidentName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-700 to-violet-900 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-violet-700/25 transition-all hover:shadow-violet-700/40"
                    onClick={continueToVerification}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Phone number</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-4 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        type="tel"
                        placeholder="+234..."
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Verification code</label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-4 text-sm font-medium uppercase tracking-wider text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 placeholder:normal-case placeholder:tracking-normal focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                        placeholder="BS-XX-2025"
                        required
                      />
                    </div>
                    <span className="mt-1.5 block text-xs text-white/40">
                      Your estate admin provided this code during registration
                    </span>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-12 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/40 transition-colors hover:text-white/70"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-5 text-sm font-bold text-white/70 transition-all hover:bg-white/10"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-700 to-violet-900 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-violet-700/25 transition-all hover:shadow-violet-700/40 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Spinner className="text-white" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-6 text-center text-sm text-white/50">
                Are you an estate admin?{" "}
                <Link href="/auth/sign-in" className="font-bold text-emerald-400 hover:text-emerald-200">
                  Sign in here
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.10] px-6 py-4 lg:px-10">
          <p className="text-xs text-white/35">
            &copy; {new Date().getFullYear()} GatePilot. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-white/35">
            <span className="cursor-pointer hover:text-white/55">Privacy Policy</span>
            <span className="cursor-pointer hover:text-white/55">Terms of Service</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
