import Link from "next/link";
import { LogOut, Menu, Settings, ShieldCheck, X } from "lucide-react";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import { getUserById } from "@/lib/repos/users";
import type { NavItem } from "@/components/sidebar-nav";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";

function formatRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Administrator";
    case "ESTATE_ADMIN":
      return "Estate Administrator";
    case "GUARD":
      return "Security Guard";
    case "RESIDENT":
      return "Resident";
    case "RESIDENT_DELEGATE":
      return "Resident Delegate";
    default:
      return role;
  }
}

async function SignOutButton({ className }: { className?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        clearSessionCookie();
      }}
    >
      <button
        className={className || "inline-flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"}
        type="submit"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}

export async function AppShell({
  title,
  nav,
  bottomNav,
  children,
}: {
  title?: string;
  nav?: NavItem[];
  bottomNav?: NavItem[];
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Fetch user from DynamoDB to get accurate name (token may have stale data)
  const dbUser = session?.userId ? await getUserById(session.userId) : null;
  const displayName = dbUser?.name || session?.name || "User";

  // Combine nav items for mobile
  const allNavItems = [...(nav || []), ...(bottomNav || [])];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Fixed sidebar - desktop only */}
        <aside className="hidden w-72 flex-shrink-0 md:block">
          <div className="fixed top-0 h-screen w-72 flex-col border-r border-slate-200 bg-white/80 px-5 py-6 backdrop-blur-xl flex">
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-700 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-tight text-slate-900">Basic Security</div>
                <div className="text-xs font-semibold tracking-wide text-slate-500">
                  {session?.role ? formatRoleLabel(session.role) : "Portal"}
                </div>
              </div>
            </Link>

            {/* Main navigation at top */}
            {nav?.length ? (
              <div className="mt-8">
                <SidebarNav items={nav} />
              </div>
            ) : null}

            {/* Bottom section: user info, settings, sign out */}
            <div className="mt-auto pt-6">
              {session ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">{displayName}</div>
                  <div className="mt-1 text-xs font-semibold tracking-wide text-slate-500">
                    {formatRoleLabel(session.role)}
                  </div>

                  {/* Settings and other bottom nav items */}
                  {bottomNav?.length ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <SidebarNav items={bottomNav} />
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <SignOutButton />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile header */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
              <div className="flex items-center gap-3 md:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-700 text-white shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-slate-900">Basic Security</div>
                  {title && (
                    <div className="text-xs font-semibold text-slate-500">{title}</div>
                  )}
                </div>
              </div>
              <div className="hidden min-w-0 md:block">
                {title ? (
                  <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                    {title}
                  </h1>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {session ? (
                  <div className="hidden text-sm font-medium text-slate-700 lg:block">
                    {displayName}
                  </div>
                ) : null}
                {/* Mobile sign out */}
                {session ? (
                  <div className="md:hidden">
                    <SignOutButton className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" />
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="px-4 py-4 md:px-6 md:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav items={allNavItems} />
    </div>
  );
}
