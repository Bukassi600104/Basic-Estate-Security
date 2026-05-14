"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  KeyRound,
  Menu,
  Shield,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.12] bg-white/[0.07] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.11] hover:border-brand-green/25 hover:shadow-lg hover:shadow-brand-green/5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-brand-green/15 p-3 text-brand-green shadow-lg transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        <div>
          <div className="text-lg font-bold text-white">{title}</div>
          <div className="mt-2 text-sm text-white/60 leading-relaxed">{description}</div>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white sm:text-4xl">
        <AnimatedCounter end={value} suffix={suffix} duration={2500} />
      </div>
      <div className="mt-1 text-sm text-brand-green/80">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0f2318]">
      {/* Subtle ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand-green/8 blur-[128px] animate-pulse-soft" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-brand-green/10 blur-[128px] animate-pulse-soft" style={{ animationDelay: "1s" }} />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(rgba(74, 222, 128, 0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
          }}
        />
      </div>

      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-0 z-30 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/[0.12] bg-[#0f2318]/95 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/30 bg-brand-green/10">
              <Shield className="h-5 w-5 text-brand-green" />
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wider text-white">GatePilot</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green">Security</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              href="/auth/resident-verify"
            >
              Residents
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              href="/auth/guard-verify"
            >
              Security Guards
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              href="/auth/sign-in"
            >
              Admin Login
            </Link>
            <Link
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40"
              href="/auth/sign-up"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>

          <button
            className="rounded-xl p-2 text-white/70 hover:bg-white/[0.08] md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/[0.12] bg-[#0f2318]/97 backdrop-blur-xl px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                href="/auth/resident-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Residents
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                href="/auth/guard-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security Guards
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                href="/auth/sign-in"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Login
              </Link>
              <Link
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-5 py-3 text-sm font-bold text-white"
                href="/auth/sign-up"
                onClick={() => setMobileMenuOpen(false)}
              >
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen pt-24 lg:pt-32">
          {/* Very subtle background texture — much lighter than before */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: "radial-gradient(rgba(74, 222, 128, 0.4) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f2318] via-[#0f2318]/70 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16 min-h-[calc(100vh-8rem)]">
              {/* Left content */}
              <div className="relative z-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green w-fit">
                  <Shield className="h-4 w-4" />
                  Trusted by estates nationwide
                </div>

                <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  <span className="block">SECURITY YOU</span>
                  <span className="block mt-2">
                    CAN{" "}
                    <span className="text-brand-green">TRUST</span>
                  </span>
                </h1>

                <p className="mt-8 max-w-lg text-lg text-white/65 leading-relaxed">
                  Empower your residents with instant guest passes. Give guards real-time validation.
                  Provide estate administrators complete oversight and security audit trails.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    href="/auth/sign-up"
                    className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40 hover:-translate-y-0.5"
                  >
                    Create Account Free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="rounded-full border-2 border-white/25 px-8 py-4 text-base font-bold text-white transition-all hover:border-brand-green/50 hover:bg-white/[0.06]"
                  >
                    Sign In
                  </Link>
                </div>

                <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-white/55">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-brand-green" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-brand-green" />
                    <span>Setup in 5 minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-brand-green" />
                    <span>24/7 Support</span>
                  </div>
                </div>
              </div>

              {/* Right — Large bright security guard image */}
              <div className="relative lg:h-[620px]">
                {/* Floating accent icons */}
                <div className="absolute top-10 -left-12 floating z-20 hidden xl:block">
                  <div className="rounded-2xl border border-white/15 bg-[#0f2318]/80 backdrop-blur p-4 shadow-xl">
                    <ShieldCheck className="h-8 w-8 text-brand-green" />
                  </div>
                </div>
                <div className="absolute top-1/3 -right-5 floating-delayed z-20 hidden xl:block">
                  <div className="rounded-2xl border border-white/15 bg-[#0f2318]/80 backdrop-blur p-4 shadow-xl">
                    <KeyRound className="h-8 w-8 text-brand-green/80" />
                  </div>
                </div>
                <div className="absolute bottom-1/4 -left-12 floating-slow z-20 hidden xl:block">
                  <div className="rounded-2xl border border-white/15 bg-[#0f2318]/80 backdrop-blur p-4 shadow-xl">
                    <Users className="h-8 w-8 text-brand-green/80" />
                  </div>
                </div>

                {/* Main guard image card — bright and prominent */}
                <div className="relative h-[440px] overflow-hidden rounded-3xl border border-white/20 bg-white/[0.96] p-5 shadow-2xl shadow-black/40 lg:h-full">
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-emerald-100 via-sky-50 to-white" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Live estate command</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-slate-950">GatePilot Control</h3>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Online
                    </div>
                  </div>

                  <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      ["Residents", "248", Users],
                      ["Gates", "06", Shield],
                      ["Today", "1,204", KeyRound],
                    ].map(([label, value, Icon]) => (
                      <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <Icon className="h-5 w-5 text-emerald-700" />
                        <div className="mt-4 text-2xl font-extrabold text-slate-950">{String(value)}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{String(label)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Validation stream</p>
                        <h4 className="mt-2 text-lg font-bold">Access activity</h4>
                      </div>
                      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Secure</span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {[
                        ["Main Gate", "Guest entry allowed", "2m ago"],
                        ["Service Gate", "Staff code renewed", "8m ago"],
                        ["North Gate", "Exit code verified", "14m ago"],
                      ].map(([gate, detail, time]) => (
                        <div key={gate} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-3">
                          <div>
                            <p className="font-semibold">{gate}</p>
                            <p className="text-sm text-white/55">{detail}</p>
                          </div>
                          <p className="text-xs text-white/45">{time}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 z-20 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-950">Access Validated</p>
                        <p className="text-sm text-slate-500">Code verified successfully</p>
                      </div>
                      <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                        Secure
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green/12 via-brand-green/7 to-brand-green/12 border-y border-white/[0.08]" />
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <StatItem value={1500} suffix="+" label="Estates Protected" />
              <StatItem value={50} suffix="K+" label="Active Users" />
              <StatItem value={100} suffix="K+" label="Codes Generated" />
              <StatItem value={99} suffix="%" label="Uptime" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Everything you need to{" "}
                <span className="text-brand-green">secure your estate</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
                A complete security solution designed for modern residential estates
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
              <Feature
                icon={<KeyRound className="h-6 w-6" />}
                title="Guest & Staff Codes"
                description="Generate time-bound guest passes that expire after 6 hours. Create renewable domestic staff codes that last 6 months."
              />
              <Feature
                icon={<ShieldCheck className="h-6 w-6" />}
                title="Real-time Validation"
                description="Guards validate codes instantly at the gate. Every decision is logged with timestamp, guard ID, and outcome."
              />
              <Feature
                icon={<Building2 className="h-6 w-6" />}
                title="Estate Oversight"
                description="Estate admins onboard residents, manage gates, and review all entry activities with comprehensive audit trails."
              />
              <Feature
                icon={<Users className="h-6 w-6" />}
                title="Resident Management"
                description="Onboard residents with their house numbers. Residents can generate codes for their visitors and staff members."
              />
              <Feature
                icon={<Shield className="h-6 w-6" />}
                title="Multi-Gate Support"
                description="Configure multiple entry points. Track which gate each validation occurred at for complete security coverage."
              />
              <Feature
                icon={<CheckCircle className="h-6 w-6" />}
                title="Export & Reports"
                description="Export validation logs to Excel. Generate reports for security audits and compliance requirements."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.15] bg-white/[0.05] backdrop-blur p-12 lg:p-16 shadow-xl">
              <div className="absolute inset-0 opacity-[0.12]">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "radial-gradient(rgba(74, 222, 128, 0.4) 1px, transparent 1px)",
                    backgroundSize: "30px 30px",
                  }}
                />
              </div>
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-green/8 rounded-full blur-3xl" />

              <div className="relative z-10 text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Ready to secure your estate?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
                  Join thousands of estates using GatePilot to protect their residents.
                  Get started in minutes with no technical setup required.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/auth/sign-up"
                    className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40 hover:-translate-y-0.5"
                  >
                    Create Your Account
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="rounded-full border-2 border-white/25 px-8 py-4 text-base font-bold text-white transition-all hover:border-brand-green/50 hover:bg-white/[0.06]"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.12]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/30 bg-brand-green/10">
                <Shield className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-white">GatePilot</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green">Security</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <Link href="/auth/resident-verify" className="hover:text-brand-green transition-colors">
                Residents
              </Link>
              <Link href="/auth/guard-verify" className="hover:text-brand-green transition-colors">
                Guards
              </Link>
              <Link href="/auth/sign-in" className="hover:text-brand-green transition-colors">
                Admin
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-white/[0.08] pt-8 text-center text-sm text-white/35">
            &copy; {new Date().getFullYear()} GatePilot. All rights reserved.
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/auth/sign-in"
              className="text-xs italic text-white/20 hover:text-white/40 transition-colors"
            >
              Super Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
