import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-screen max-w-2xl place-content-center px-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-sm backdrop-blur">
        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">404</div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The page you’re looking for doesn’t exist.</p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
          >
            Go home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
