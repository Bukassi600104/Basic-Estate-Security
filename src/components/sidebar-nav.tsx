"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"
                : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            }
          >
            {item.icon ? (
              <span className={active ? "text-emerald-700" : "text-slate-400"}>
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
