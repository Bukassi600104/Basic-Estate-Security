"use client";

import { useMemo, useState } from "react";

type ValidationRow = {
  logId: string;
  validatedAt: string;
  houseNumber?: string | null;
  residentName?: string | null;
  passType?: string | null;
  decision: string;
};

export function SuperAdminValidationsSection({
  estateId,
  initialValidations,
  initialNextCursor,
}: {
  estateId: string;
  initialValidations: ValidationRow[];
  initialNextCursor: string | null;
}) {
  const [items, setItems] = useState<ValidationRow[]>(initialValidations);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => items, [items]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setError(null);
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/super-admin/estates/${estateId}/validations?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load more validations");

      const newItems = (data.validations as ValidationRow[] | undefined) ?? [];
      const newCursor = (data.nextCursor as string | undefined) ?? null;

      setItems((prev) => {
        const seen = new Set(prev.map((v) => v.logId));
        const deduped = newItems.filter((v) => !seen.has(v.logId));
        return [...prev, ...deduped];
      });
      setNextCursor(newCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more validations");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <h2 className="text-base font-semibold">Recent validations</h2>
      <div className="mt-2 text-sm text-white/60">Latest validation attempts.</div>
      <div className="mt-3 flex items-center justify-between">
        <a
          href={`/api/super-admin/estates/${estateId}/validations/export`}
          className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/5"
        >
          Export CSV
        </a>
        <div className="text-xs font-semibold text-white/50">Estate scope</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-white/60">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4 font-semibold">Time</th>
              <th className="py-2 pr-4 font-semibold">House</th>
              <th className="py-2 pr-4 font-semibold">Resident</th>
              <th className="py-2 pr-4 font-semibold">Type</th>
              <th className="py-2 pr-4 font-semibold">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.logId} className="border-b border-white/5">
                <td className="py-3 pr-4 text-white/70">{new Date(v.validatedAt).toLocaleString()}</td>
                <td className="py-3 pr-4 text-white/70">{v.houseNumber ?? "—"}</td>
                <td className="py-3 pr-4 text-white/70">{v.residentName ?? "—"}</td>
                <td className="py-3 pr-4 text-white/70">{v.passType ?? "—"}</td>
                <td className="py-3 pr-4 text-white/70">{v.decision}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-3 text-white/60" colSpan={5}>
                  No data.
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
