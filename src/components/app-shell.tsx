import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import type { NavItem } from "@/components/sidebar-nav";
import { SidebarNav } from "@/components/sidebar-nav";

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        clearSessionCookie();
      }}
    >
      <button
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
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
  children,
}: {
  title?: string;
  nav?: NavItem[];
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/80 px-5 py-6 backdrop-blur-xl md:flex">
          <Link href="/dashboard" className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-slate-900">Basic Security</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {session?.role ?? "Portal"}
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">{session.name}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {session.role}
                </div>
                <div className="mt-4">
                  <SignOutButton />
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-500 md:hidden">
                  Basic Security
                </div>
                {title ? (
                  <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                    {title}
                  </h1>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                {session ? (
                  <div className="hidden text-sm text-slate-600 lg:block">
                    {session.name}
                  </div>
                ) : null}
                {session ? (
                  <div className="md:hidden">
                    <SignOutButton />
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="px-6 py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
