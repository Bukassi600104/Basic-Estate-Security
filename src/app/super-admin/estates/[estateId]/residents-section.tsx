"use client";

import { useMemo, useState } from "react";

type ResidentRow = {
  residentId: string;
  name: string;
  houseNumber: string;
  status: string;
};

export function SuperAdminResidentsSection({
  estateId,
  initialResidents,
  initialNextCursor,
}: {
  estateId: string;
  initialResidents: ResidentRow[];
  initialNextCursor: string | null;
}) {
  const [residents, setResidents] = useState<ResidentRow[]>(initialResidents);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => residents, [residents]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setError(null);
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/super-admin/estates/${estateId}/residents?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load more residents");

      const newItems = (data.residents as ResidentRow[] | undefined) ?? [];
      const newCursor = (data.nextCursor as string | undefined) ?? null;

      setResidents((prev) => {
        const seen = new Set(prev.map((r) => r.residentId));
        const deduped = newItems.filter((r) => !seen.has(r.residentId));
        return [...prev, ...deduped].sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
      });
      setNextCursor(newCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more residents");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <h2 className="text-base font-semibold">Residents</h2>
      <div className="mt-2 text-sm text-white/60">Paginated list.</div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-white/60">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Unit</th>
              <th className="py-2 pr-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.residentId} className="border-b border-white/5">
                <td className="py-3 pr-4 text-white/70">{r.name}</td>
                <td className="py-3 pr-4 text-white/70">{r.houseNumber}</td>
                <td className="py-3 pr-4 text-white/70">{r.status}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-3 text-white/60" colSpan={3}>
                  No residents.
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
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-xs font-extrabold text-white hover:bg-white/5 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
