"use client";

import { useMemo, useState } from "react";

type GuardRow = {
  userId: string;
  name: string;
  identifier: string;
  createdAt: string;
};

export function SuperAdminGuardsSection({
  estateId,
  initialGuards,
  initialNextCursor,
}: {
  estateId: string;
  initialGuards: GuardRow[];
  initialNextCursor: string | null;
}) {
  const [guards, setGuards] = useState<GuardRow[]>(initialGuards);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => guards, [guards]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setError(null);
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/super-admin/estates/${estateId}/guards?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load more guards");

      const newItems = (data.guards as GuardRow[] | undefined) ?? [];
      const newCursor = (data.nextCursor as string | undefined) ?? null;

      setGuards((prev) => {
        const seen = new Set(prev.map((g) => g.userId));
        const deduped = newItems.filter((g) => !seen.has(g.userId));
        return [...prev, ...deduped].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNextCursor(newCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more guards");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold">Guards</h2>
      <div className="mt-2 text-sm text-slate-600">Accounts in this estate.</div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Identifier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.userId} className="border-b border-slate-100">
                <td className="py-3 pr-4 text-slate-700">{g.name}</td>
                <td className="py-3 pr-4 text-slate-700">{g.identifier}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-3 text-slate-600" colSpan={2}>
                  No guards.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {nextCursor ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
