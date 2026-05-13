import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/client";
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
        const supabase = createSupabaseServerClient();
        await supabase.auth.signOut();
      }}
    >
      <button
        className={className || "inline-flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"}
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

  const dbUser = session?.userId ? await getUserById(session.userId) : null;
  const displayName = dbUser?.name || session?.name || "User";

  const allNavItems = [...(nav || []), ...(bottomNav || [])];

  return (
    <div className="min-h-screen bg-[#0a1a0f] pb-20 md:pb-0">
      {/* Dynamic background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-brand-green/5 blur-[120px] animate-pulse-soft" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-brand-green/8 blur-[120px] animate-pulse-soft" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-navy/10 blur-[100px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Fixed sidebar - desktop only */}
        <aside className="hidden w-72 flex-shrink-0 md:block">
          <div className="fixed top-0 h-screen w-72 flex-col border-r border-white/10 bg-[#0d1f12]/80 px-5 py-6 backdrop-blur-xl flex">
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-green/30 bg-brand-green/10 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-brand-green" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-tight text-white">Basic Security</div>
                <div className="text-xs font-semibold tracking-wide text-brand-green/70">
                  {session?.role ? formatRoleLabel(session.role) : "Portal"}
                </div>
              </div>
            </Link>

            {nav?.length ? (
              <div className="mt-8">
                <SidebarNav items={nav} />
              </div>
            ) : null}

            <div className="mt-auto pt-6">
              {session ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white">{displayName}</div>
                  <div className="mt-1 text-xs font-semibold tracking-wide text-brand-green/60">
                    {formatRoleLabel(session.role)}
                  </div>

                  {bottomNav?.length ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
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
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a1a0f]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
              <div className="flex items-center gap-3 md:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-green/30 bg-brand-green/10 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-brand-green" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-white">Basic Security</div>
                  {title && (
                    <div className="text-xs font-semibold text-brand-green/60">{title}</div>
                  )}
                </div>
              </div>
              <div className="hidden min-w-0 md:block">
                {title ? (
                  <h1 className="truncate text-lg font-extrabold tracking-tight text-white">
                    {title}
                  </h1>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {session ? (
                  <div className="hidden text-sm font-medium text-white/70 lg:block">
                    {displayName}
                  </div>
                ) : null}
                {session ? (
                  <div className="md:hidden">
                    <SignOutButton className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white" />
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

      <MobileNav items={allNavItems} />
    </div>
  );
}
