"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, User } from "lucide-react";

const tabs = [
  { href: "/resident-app/codes", label: "Home", icon: Home },
  { href: "/resident-app/history", label: "History", icon: Clock },
  { href: "/resident-app/profile", label: "Profile", icon: User },
] as const;

export function ResidentLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0a1a0f]">
      {/* Dynamic background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-600/5 blur-[100px] animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-600/8 blur-[100px] animate-pulse-soft" style={{ animationDelay: "1s" }} />
      </div>

      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0a1a0f]/95 backdrop-blur-lg safe-area-pb">
        <div className="mx-auto flex max-w-lg items-center justify-around px-4 py-2">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href === "/resident-app/codes" && pathname === "/resident-app");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "text-emerald-600"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <tab.icon
                  className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`}
                />
                {tab.label}
                {active && (
                  <div className="mt-0.5 h-1 w-1 rounded-full bg-emerald-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
