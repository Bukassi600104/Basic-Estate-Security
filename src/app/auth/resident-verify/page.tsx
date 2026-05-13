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

export default function ResidentVerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [estateName, setEstateName] = useState("");
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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a1a0f]">
      {/* Background */}
      <div className="absolute inset-0">
        <Image src="/images/security-guard.png" alt="" fill className="object-cover object-center opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1a0f] via-[#0a1a0f]/95 to-[#0a1a0f]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0f] via-transparent to-[#0a1a0f]/90" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/30 bg-brand-green/10">
              <Shield className="h-5 w-5 text-brand-green" />
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wider text-white">Basic Estate</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green">Security</div>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-green/30 bg-brand-green/10">
                <User className="h-8 w-8 text-brand-green" />
              </div>
            </div>

            <h1 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-white">
              Resident <span className="text-brand-green">Sign-in</span>
            </h1>
            <p className="mt-2 text-center text-sm text-white/50">
              {step === 1 ? "Enter your estate and name" : "Enter your verification details"}
            </p>

            {/* Step indicator */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
              <div className={`h-2 w-2 rounded-full ${step === 1 ? "bg-brand-green" : "bg-white/20"}`} />
              <span className={step === 1 ? "text-brand-green" : ""}>Identity</span>
              <div className="mx-2 h-px w-8 bg-white/10" />
              <div className={`h-2 w-2 rounded-full ${step === 2 ? "bg-brand-green" : "bg-white/20"}`} />
              <span className={step === 2 ? "text-brand-green" : ""}>Verification</span>
            </div>

            <form className="mt-8" onSubmit={onSubmit}>
              {step === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Estate name</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-11 pr-4 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-brand-green/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-green/20"
                        value={estateName}
                        onChange={(e) => setEstateName(e.target.value)}
                        placeholder="Blue Gardens Estate"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/70">Your name</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      <input
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-11 pr-4 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-brand-green/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-green/20"
                        value={residentName}
                        onChange={(e) => setResidentName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-green-600 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40"
                    onClick={() => {
                      if (estateName.trim().length && residentName.trim().length) setStep(2);
                    }}
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
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-11 pr-4 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-brand-green/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-green/20"
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
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-11 pr-4 text-sm font-medium uppercase tracking-wider text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 placeholder:normal-case placeholder:tracking-normal focus:border-brand-green/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-green/20"
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
                        className="h-12 w-full rounded-lg border border-white/15 bg-white/5 pl-11 pr-12 text-sm font-medium text-white outline-none backdrop-blur-sm transition-all placeholder:text-white/30 focus:border-brand-green/50 focus:bg-white/10 focus:ring-2 focus:ring-brand-green/20"
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
                      className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-bold text-white/70 transition-all hover:bg-white/10"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-green-600 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40 disabled:opacity-60"
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
                <Link href="/auth/sign-in" className="font-bold text-brand-green hover:text-brand-green-300">
                  Sign in here
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4 lg:px-10">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Basic Estate Security. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-white/30">
            <span className="cursor-pointer hover:text-white/50">Privacy Policy</span>
            <span className="cursor-pointer hover:text-white/50">Terms of Service</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
