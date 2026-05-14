import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getUserById, listAdminEstateAccess } from "@/lib/repos/users";
import { getEstateById } from "@/lib/repos/estates";
import { EstateSwitcher, type EstateSwitchOption } from "@/components/estate-switcher";
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
        className={className || "inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"}
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
  const estate = session?.estateId ? await getEstateById(session.estateId) : null;
  const estateOptionsRaw = session?.userId && (session.role === "ESTATE_ADMIN" || session.role === "SUB_ADMIN")
    ? await Promise.all(
        (await listAdminEstateAccess({ userId: session.userId })).map(async (access): Promise<EstateSwitchOption | null> => {
          const item = await getEstateById(access.estateId);
          return item ? { id: item.estateId, name: item.name, address: item.address } : null;
        }),
      )
    : [];
  const estateOptions = estateOptionsRaw.filter((item): item is EstateSwitchOption => item !== null);
  const displayName = dbUser?.name || session?.name || "User";

  const allNavItems = [...(nav || []), ...(bottomNav || [])];

  return (
    <div className="gp-dashboard-bg min-h-screen pb-20 text-slate-950 md:pb-0">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        {/* Fixed sidebar - desktop only */}
        <aside className="hidden w-72 flex-shrink-0 md:block">
          <div className="fixed top-0 flex h-screen w-72 flex-col border-r border-violet-100 bg-white px-5 py-6 shadow-[16px_0_50px_rgba(76,29,149,0.06)]">
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <Image
                src="/images/gatepilot-mark.png"
                alt="GatePilot logo"
                width={44}
                height={44}
                className="rounded-lg bg-white shadow-[0_14px_30px_rgba(109,40,217,0.18)]"
                priority
              />
              <div className="leading-tight">
                <div className="text-base font-black uppercase tracking-normal text-slate-950">GatePilot</div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
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
                <div className="rounded-lg border border-violet-100 bg-[#f8f7ff] p-4 shadow-inner">
                  {estate ? (
                    <div className="mb-4 rounded-lg border border-violet-100 bg-white p-3 shadow-sm">
                      <div className="gp-panel-title">Active estate</div>
                      <div className="mt-2 truncate text-base font-black uppercase text-slate-950">{estate.name}</div>
                      <div className="truncate text-xs text-slate-500">{estate.address || estate.estateId}</div>
                      <EstateSwitcher estates={estateOptions} activeEstateId={estate.estateId} />
                    </div>
                  ) : null}
                  <div className="text-sm font-black text-slate-950">{displayName}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
                    {formatRoleLabel(session.role)}
                  </div>

                  {bottomNav?.length ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
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
          <header className="sticky top-0 z-20 border-b border-violet-100 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
              <div className="flex items-center gap-3 md:hidden">
                <Image
                  src="/images/gatepilot-mark.png"
                  alt="GatePilot logo"
                  width={36}
                  height={36}
                  className="rounded-lg bg-white shadow-sm"
                  priority
                />
                <div className="leading-tight">
                  <div className="text-xs font-black uppercase text-slate-950">GatePilot</div>
                  {title && (
                    <div className="text-xs font-bold text-slate-500">{title}</div>
                  )}
                </div>
              </div>
              <div className="hidden min-w-0 md:block">
                {title ? (
                  <h1 className="truncate text-xl font-black uppercase tracking-normal text-slate-950">
                    {title}
                  </h1>
                ) : null}
                {estate ? (
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {estate.name} {estate.address ? `- ${estate.address}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {session ? (
                  <div className="hidden text-sm font-medium text-slate-600 lg:block">
                    {displayName}
                  </div>
                ) : null}
                {session ? (
                  <div className="md:hidden">
                    <SignOutButton className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-950" />
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
