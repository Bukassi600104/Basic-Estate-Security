"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  DoorOpen,
  KeyRound,
  RadioTower,
  ShieldCheck,
  Users,
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";
import { ParallaxVisual } from "@/components/parallax-visual";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const capabilityCards = [
  {
    icon: KeyRound,
    title: "Smart access codes",
    text: "Residents create guest and staff passes with clear expiry rules and full validation history.",
  },
  {
    icon: DoorOpen,
    title: "Gate operations",
    text: "Guards validate instantly, record outcomes, and keep each entrance accountable.",
  },
  {
    icon: Building2,
    title: "Estate command",
    text: "Admins manage houses, gates, residents, teams, billing, and logs from one organized cockpit.",
  },
];

const workflow = [
  "Resident creates secure code",
  "Guard validates at the correct gate",
  "Estate admin sees usage and audit trails",
  "Owner monitors estate-level performance",
];

export default function HomePage() {
  return (
    <div className="gp-page overflow-hidden">
      <MarketingHeader />

      <main>
        <section className="relative min-h-screen pt-28 lg:pt-32">
          <div className="absolute inset-x-0 top-0 h-[76%] bg-white" />
          <div className="absolute right-0 top-0 hidden h-[68%] w-[44%] bg-violet-700 lg:block" />
          <div className="absolute left-0 top-36 hidden h-32 w-24 bg-emerald-400 lg:block" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
            <div className="relative z-10">
              <div className="gp-kicker">
                <ShieldCheck className="h-4 w-4" />
                Built for gated estates
              </div>

              <h1 className="gp-display mt-7 max-w-3xl text-[4.4rem] sm:text-[6rem] lg:text-[7.4rem]">
                Access
                <span className="block">Control</span>
                <span className="gp-display-mark mt-2">Solved.</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg font-semibold leading-8 text-slate-600">
                GatePilot gives estates a bold, simple operating system for resident onboarding,
                visitor codes, gate validation, and owner-level security analytics.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/auth/sign-up" className="gp-button-primary">
                  Start 30-Day Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="gp-button-secondary">
                  See Pricing
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ["6H", "Guest TTL"],
                  ["183D", "Staff renewal"],
                  ["24/7", "Gate logs"],
                ].map(([value, label]) => (
                  <div key={label} className="gp-card p-4">
                    <div className="text-3xl font-black text-violet-700">{value}</div>
                    <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <ParallaxVisual strength={0.08} className="relative z-10">
              <div className="relative">
                <div className="absolute -left-4 top-10 z-20 hidden rotate-[-6deg] rounded-lg bg-white px-5 py-4 shadow-2xl lg:block">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Live Gate</div>
                  <div className="mt-1 text-3xl font-black text-slate-950">VALID</div>
                </div>
                <div className="absolute -right-3 bottom-12 z-20 hidden rotate-[4deg] rounded-lg bg-violet-700 px-5 py-4 text-white shadow-2xl lg:block">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Today</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-4xl font-black">1,204</span>
                    <span className="pb-1 text-xs font-bold uppercase">checks</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border-[10px] border-white bg-violet-700 shadow-[0_30px_90px_rgba(76,29,149,0.3)]">
                  <Image
                    src="/images/gatepilot-hero.png"
                    alt="Security guard, CCTV and gated estate command dashboard"
                    width={1600}
                    height={900}
                    priority
                    className="aspect-[16/11] w-full object-cover object-center"
                  />
                </div>
              </div>
            </ParallaxVisual>
          </div>
        </section>

        <section className="bg-violet-700 py-8 text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 md:grid-cols-4 lg:px-8">
            {[
              [1500, "+", "Estate-ready workflows"],
              [50000, "+", "Resident scale"],
              [100000, "+", "Code validations"],
              [99, "%", "Platform uptime"],
            ].map(([value, suffix, label]) => (
              <div key={label as string} className="border-l border-white/20 pl-5">
                <div className="text-4xl font-black">
                  <AnimatedCounter end={value as number} suffix={suffix as string} />
                </div>
                <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white/65">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f7ff] py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <div className="gp-kicker">
                  <Camera className="h-4 w-4" />
                  Clear security workflows
                </div>
                <h2 className="gp-display mt-6 text-5xl sm:text-6xl lg:text-7xl">
                  One
                  <span className="block text-violet-700">system.</span>
                  Every gate.
                </h2>
              </div>
              <p className="max-w-2xl text-lg font-semibold leading-8 text-slate-600">
                The interface is intentionally direct: big actions, readable stats, visible estate identity,
                and no confusion between estates even when names repeat or one admin manages several sites.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {capabilityCards.map((card) => (
                <div key={card.title} className="gp-card-strong p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-700 text-white">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-8 text-2xl font-black uppercase leading-none text-slate-950">{card.title}</h3>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
            <div className="relative min-h-[560px] overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
              <div className="absolute inset-x-0 top-0 h-40 bg-violet-700" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Command Screen</div>
                    <div className="mt-2 text-4xl font-black uppercase">Estate HQ</div>
                  </div>
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black uppercase text-slate-950">
                    Online
                  </span>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[
                    [Users, "248", "Residents"],
                    [DoorOpen, "06", "Gates"],
                    [RadioTower, "98%", "Success"],
                  ].map(([Icon, value, label]) => (
                    <div key={label as string} className="rounded-lg bg-white p-4 text-slate-950">
                      <Icon className="h-5 w-5 text-violet-700" />
                      <div className="mt-5 text-3xl font-black">{value as string}</div>
                      <div className="text-xs font-black uppercase tracking-wide text-slate-400">{label as string}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Validation activity</div>
                    <BadgeCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {["Main Gate", "Service Gate", "North Gate", "Visitor Lane"].map((gate, index) => (
                      <div key={gate} className="flex items-center gap-3 rounded-lg bg-slate-950/60 p-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-black">{gate}</div>
                          <div className="text-xs font-semibold text-white/50">Access code verified</div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="gp-kicker">Operational clarity</div>
              <h2 className="gp-display mt-6 text-5xl sm:text-6xl">
                Built for
                <span className="block text-violet-700">real estates.</span>
              </h2>
              <div className="mt-8 space-y-4">
                {workflow.map((item, index) => (
                  <div key={item} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-700 text-sm font-black text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="gp-card flex-1 p-4 text-lg font-black uppercase text-slate-950">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-9">
                <Link href="/auth/sign-up" className="gp-button-primary">
                  Create Estate Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-violet-700 py-20 text-white">
          <div className="mx-auto max-w-7xl px-5 text-center lg:px-8">
            <div className="mx-auto max-w-4xl">
              <h2 className="gp-display text-5xl text-white sm:text-7xl">
                Install order.
                <span className="block text-emerald-300">Remove confusion.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/70">
                Start with the standard 30-day trial, or mark one estate as a 90-day pilot from the super admin panel.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link href="/auth/sign-up" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-violet-700 shadow-xl transition hover:-translate-y-0.5">
                  Start GatePilot
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/auth/sign-in" className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-violet-700">
                  Admin Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
