import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { clearSessionCookie } from "@/lib/auth/session";

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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold tracking-wide text-slate-50">
              Basic
            </div>
            <div className="text-sm font-semibold tracking-wide text-slate-900">
              Security
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="hidden text-sm text-slate-600 md:block">
                {session.name} • {session.role}
              </div>
            ) : null}
            {session ? <SignOutButton /> : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
