import Link from "next/link";
import { ArrowRight, Building2, KeyRound, ShieldCheck } from "lucide-react";

export const dynamic = "force-static";

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-3 text-white shadow-sm">
          {icon}
        </div>
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-blue-200/40 blur-[128px]" />
        <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-indigo-200/30 blur-[128px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(2, 6, 23, 0.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)",
          }}
        />
      </div>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900">
              Basic Security
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              href="/auth/sign-in"
            >
              Admin Login
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
              href="/auth/sign-up"
            >
              Create estate
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-28 lg:pt-36">
        <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-700">
              New standard in estate safety
            </div>
            <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Intelligent access for <span className="text-blue-600">modern estates</span>.
            </h1>
            <p className="mt-5 max-w-prose text-pretty text-base text-slate-600">
              Residents generate time-bound guest passes and long-term domestic staff passes.
              Guards validate instantly. Admins onboard residents and audit every entry.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/sign-in"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
              >
                I already have an account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
              <div className="grid gap-4">
                <Feature
                  icon={<KeyRound className="h-5 w-5" />}
                  title="Guest & staff codes"
                  description="Guest codes expire after 6 hours and end immediately when validated. Domestic staff codes last 6 months and can be renewed."
                />
                <Feature
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Guard confirmation"
                  description="Validate a code, then allow or deny access—every decision is logged for the estate."
                />
                <Feature
                  icon={<Building2 className="h-5 w-5" />}
                  title="Estate oversight"
                  description="Estate admins onboard residents and review activity. Super admins oversee all estates."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white/70 p-8 text-center shadow-sm backdrop-blur">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Ready to secure your estate?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Create an estate admin account, onboard residents, issue codes, and start validating entries.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
            >
              Create estate
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-slate-500">
          © {new Date().getFullYear()} Basic Security
        </div>
      </footer>
    </div>
  );
}
