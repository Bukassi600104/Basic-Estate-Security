"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const navItems = [
  { href: "/pricing", label: "Pricing" },
  { href: "/auth/resident-verify", label: "Residents" },
  { href: "/auth/guard-verify", label: "Guards" },
  { href: "/auth/sign-in", label: "Admin Login" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition ${
        scrolled
          ? "border-b border-violet-100 bg-white/90 shadow-sm backdrop-blur-xl"
          : "bg-white/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/gatepilot-mark.png"
            alt="GatePilot logo"
            width={44}
            height={44}
            className="rounded-lg bg-white shadow-[0_14px_30px_rgba(109,40,217,0.18)]"
            priority
          />
          <span className="leading-none">
            <span className="block text-lg font-black uppercase tracking-normal text-slate-950">GatePilot</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/auth/sign-up" className="gp-button-primary px-5 py-2.5">
            Start Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
          aria-label="Open navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-violet-100 bg-white px-5 py-4 lg:hidden">
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-700 hover:bg-violet-50"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/auth/sign-up"
              onClick={() => setOpen(false)}
              className="gp-button-primary mt-2"
            >
              Start Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-violet-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/images/gatepilot-mark.png"
            alt="GatePilot logo"
            width={40}
            height={40}
            className="rounded-lg bg-white shadow-sm"
          />
          <div>
            <div className="text-sm font-black uppercase text-slate-950">GatePilot</div>
            <div className="text-xs font-bold text-slate-500">Secure access for modern estates</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-500">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-violet-700">
              {item.label}
            </Link>
          ))}
        </div>
        <p className="text-sm font-semibold text-slate-400">
          © {new Date().getFullYear()} GatePilot. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
