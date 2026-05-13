"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-brand-green/20">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-brand-green/15 p-3 text-brand-green shadow-lg transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        <div>
          <div className="text-lg font-bold text-white">{title}</div>
          <div className="mt-2 text-sm text-white/50 leading-relaxed">{description}</div>
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
      <div className="mt-1 text-sm text-brand-green/70">{label}</div>
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
    <div className="min-h-screen overflow-x-hidden bg-[#0a1a0f]">
      {/* Dynamic background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand-green/5 blur-[128px] animate-pulse-soft" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-brand-green/8 blur-[128px] animate-pulse-soft" style={{ animationDelay: "1s" }} />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(74, 222, 128, 0.08) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
          }}
        />
      </div>

      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-0 z-30 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-[#0a1a0f]/95 backdrop-blur-xl shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/30 bg-brand-green/10">
              <Shield className="h-5 w-5 text-brand-green" />
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wider text-white">Basic Estate</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green">Security</div>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              href="/auth/resident-verify"
            >
              Residents
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              href="/auth/guard-verify"
            >
              Security Guards
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              href="/auth/sign-in"
            >
              Admin Login
            </Link>
            <Link
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40"
              href="/pricing"
            >
              Create Estate
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="rounded-xl p-2 text-white/60 hover:bg-white/5 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#0a1a0f]/95 backdrop-blur-xl px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"
                href="/auth/resident-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Residents
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"
                href="/auth/guard-verify"
                onClick={() => setMobileMenuOpen(false)}
              >
                Security Guards
              </Link>
              <Link
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white"
                href="/auth/sign-in"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Login
              </Link>
              <Link
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-5 py-3 text-sm font-bold text-white"
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
              >
                Create Estate
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen pt-24 lg:pt-32">
          {/* Hero background image */}
          <div className="absolute inset-0">
            <Image
              src="/images/security-guard.png"
              alt=""
              fill
              className="object-cover object-center opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a1a0f] via-[#0a1a0f]/90 to-[#0a1a0f]/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0f] via-transparent to-[#0a1a0f]/80" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
              {/* Left content */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green">
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

                <p className="mt-8 max-w-lg text-lg text-white/50 leading-relaxed">
                  Empower your residents with instant guest passes. Give guards real-time validation.
                  Provide estate administrators complete oversight and security audit trails.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40"
                  >
                    Get Started Free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="rounded-full border-2 border-white/20 px-8 py-4 text-base font-bold text-white transition-all hover:border-brand-green/50 hover:bg-white/5"
                  >
                    Sign In
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-white/40">
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

              {/* Right content - Hero Card */}
              <div className="relative lg:h-[600px]">
                {/* Floating icons */}
                <div className="absolute top-10 left-0 floating z-20">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl">
                    <ShieldCheck className="h-8 w-8 text-brand-green" />
                  </div>
                </div>
                <div className="absolute top-1/4 right-0 floating-delayed z-20">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl">
                    <KeyRound className="h-8 w-8 text-brand-green/70" />
                  </div>
                </div>
                <div className="absolute bottom-1/4 left-0 floating-slow z-20">
                  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-xl">
                    <Users className="h-8 w-8 text-brand-green/70" />
                  </div>
                </div>

                {/* Main card */}
                <div className="relative h-[400px] lg:h-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
                  <Image
                    src="/images/security-guard.png"
                    alt="Professional Security Guard"
                    fill
                    className="object-cover object-top opacity-60"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0f] via-[#0a1a0f]/40 to-transparent" />

                  {/* Floating card on image */}
                  <div className="absolute bottom-6 left-6 right-6 z-20 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/20">
                        <ShieldCheck className="h-6 w-6 text-brand-green" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Access Validated</p>
                        <p className="text-sm text-white/50">Code verified successfully</p>
                      </div>
                      <div className="ml-auto">
                        <span className="inline-flex items-center rounded-full bg-brand-green/20 px-3 py-1 text-xs font-semibold text-brand-green">
                          Secure
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative py-20 mt-20">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green/10 via-brand-green/5 to-brand-green/10" />
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
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
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
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-12 lg:p-16">
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "radial-gradient(rgba(74, 222, 128, 0.3) 1px, transparent 1px)",
                    backgroundSize: "30px 30px",
                  }}
                />
              </div>

              <div className="relative z-10 text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Ready to secure your estate?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
                  Join thousands of estates using Basic Security to protect their residents.
                  Get started in minutes with no technical setup required.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand-green to-brand-green-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-brand-green/40"
                  >
                    Create Your Estate
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="rounded-full border-2 border-white/20 px-8 py-4 text-base font-bold text-white transition-all hover:border-brand-green/50 hover:bg-white/5"
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
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-green/30 bg-brand-green/10">
                <Shield className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-white">Basic Estate</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-green">Security</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
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
          <div className="mt-8 border-t border-white/10 pt-8 text-center text-sm text-white/30">
            &copy; {new Date().getFullYear()} Basic Estate Security. All rights reserved.
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
