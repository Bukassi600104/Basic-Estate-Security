"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/sidebar-nav";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const visibleItems = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-violet-100 bg-white/95 shadow-[0_-16px_40px_rgba(76,29,149,0.10)] backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                active
                  ? "bg-violet-700 text-white"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700"
              }`}
            >
              {item.icon ? (
                <span className={active ? "text-white" : "text-slate-400"}>
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate text-[10px] font-black uppercase leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
