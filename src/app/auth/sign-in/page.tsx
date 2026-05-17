"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Globe, Info, Lock, Shield, User } from "lucide-react";
import { Spinner } from "@/components/Spinner";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    if (email) setIdentifier(email);
    if (message === "account_exists") {
      setInfoMessage("An account with this email already exists. Please sign in.");
    }
  }, [searchParams]);

  useEffect(() => {
    function handleScroll() {
      setScrollY(window.scrollY);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-in failed");

      if (data?.challenge === "SOFTWARE_TOKEN_MFA") {
        setMfaRequired(true);
        return;
      }

      if (data?.ok !== true) throw new Error(data.error ?? "Sign-in failed");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmMfa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, code: mfaCode, rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] bg-[#f8f7ff]">
      {/* Left side — Security Guard Image with Parallax */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        >
          <Image
            src="/images/gatepilot-hero.png"
            alt="Security Guard"
            fill
            className="object-cover object-[95%_center]"
            style={{ filter: 'brightness(1.4) contrast(1.05)' }}
            priority
          />
        </div>
        {/* Light gradient on right edge only — blends into form */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-violet-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-transparent to-violet-700/30" />
        <div className="absolute left-0 top-[28%] h-56 w-[52%] bg-gradient-to-r from-violet-950 via-violet-950/95 to-violet-700/10" />

        {/* Floating badge */}
        <div className="absolute bottom-12 left-10 right-10">
          <div className="rounded-2xl border border-white/15 bg-violet-950/78 p-6 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-700/20">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Trusted Security Platform</p>
                <p className="text-xs text-white/60">Protecting estates across Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="relative z-10 flex w-full flex-col bg-violet-700 text-white lg:w-1/2">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/gatepilot-mark.png"
                alt="GatePilot logo"
                width={40}
                height={40}
                className="rounded-lg bg-white"
                priority
              />
              <div className="text-sm font-extrabold tracking-tight text-white">
                Gate<span className="text-emerald-400">Pilot</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
            <Globe className="h-3.5 w-3.5" />
            EN
          </div>
        </header>

        {/* Form area */}
        <div className="flex flex-1 items-center px-6 pb-10 lg:px-12">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
              Welcome Back
            </div>

            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
              SECURITY<br />
              YOU CAN <span className="text-emerald-400">TRUST</span>
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Sign in to your account to continue
              monitoring and protecting what matters.
            </p>

            <form className="mt-8 grid gap-4" onSubmit={mfaRequired ? onConfirmMfa : onSubmit}>
              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                  Email Address
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="username"
                    disabled={mfaRequired}
                    required
                  />
                </div>
              </div>

              {/* Password or MFA */}
              {mfaRequired ? (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/75">
                    Authenticator Code
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                    <input
                      className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter 6-digit code"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/75">
                      Password
                    </label>
                    <span className="text-xs font-semibold text-emerald-400 cursor-pointer hover:text-emerald-200">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                    <input
                      className="h-12 w-full rounded-lg border border-white/15 bg-white/10 pl-11 pr-12 text-sm font-medium text-white outline-none transition-all placeholder:text-white/35 focus:border-violet-400 focus:bg-white/15 focus:ring-2 focus:ring-violet-200"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/45 transition-colors hover:text-white/70"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me */}
              <label className="inline-flex items-center gap-2.5 text-sm text-white/70">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-white/10 text-emerald-400 focus:ring-violet-300"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="font-medium">Remember me</span>
              </label>

              {infoMessage && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-300">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {infoMessage}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-1 flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-violet-700 to-violet-900 px-6 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-violet-700/25 transition-all hover:shadow-violet-700/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
              >
                {loading ? (
                  <>
                    <Spinner className="text-white" />
                    {mfaRequired ? "Verifying..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    {mfaRequired ? "Confirm Code" : "Sign In"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Secure login badge */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/45">
              <Lock className="h-3 w-3" />
              Secure login protected by 256-bit encryption
            </div>

            {/* Footer links */}
            <div className="mt-8 flex flex-col gap-3 text-sm text-white/55">
              <div>
                New estate?{" "}
                <Link href="/auth/sign-up" className="font-bold text-emerald-400 hover:text-emerald-200">
                  Create an account
                </Link>
              </div>
              <div className="flex gap-4 text-xs">
                <Link href="/auth/guard-verify" className="font-semibold text-white/45 hover:text-emerald-400 transition-colors">
                  Security Guard Login
                </Link>
                <Link href="/auth/resident-verify" className="font-semibold text-white/45 hover:text-emerald-400 transition-colors">
                  Resident Login
                </Link>
              </div>
            </div>
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

      {/* Mobile background image (faint texture) */}
      <div className="fixed inset-0 -z-10 lg:hidden">
        <Image
          src="/images/gatepilot-hero.png"
          alt=""
          fill
          className="object-cover object-[95%_center]"
          style={{ filter: 'brightness(1.4)', opacity: 0.08 }}
        />
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f7ff]" />}>
      <SignInForm />
    </Suspense>
  );
}
