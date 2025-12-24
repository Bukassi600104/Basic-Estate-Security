"use client";

import { useMemo, useState } from "react";

type ActivityRow = {
  activityId: string;
  type: string;
  message: string;
  createdAt: string;
};

export function SuperAdminActivitySection({
  estateId,
  initialActivity,
  initialNextCursor,
}: {
  estateId: string;
  initialActivity: ActivityRow[];
  initialNextCursor: string | null;
}) {
  const [items, setItems] = useState<ActivityRow[]>(initialActivity);
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
        `/api/super-admin/estates/${estateId}/activity?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load more activity");

      const newItems = (data.activity as ActivityRow[] | undefined) ?? [];
      const newCursor = (data.nextCursor as string | undefined) ?? null;

      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.activityId));
        const deduped = newItems.filter((a) => !seen.has(a.activityId));
        return [...prev, ...deduped];
      });
      setNextCursor(newCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more activity");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold">Activity</h2>
      <div className="mt-2 text-sm text-slate-600">Latest events.</div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {rows.map((a) => (
          <div
            key={a.activityId}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="text-sm text-slate-800">
              <span className="font-semibold">{a.type}</span> — {a.message}
            </div>
            <div className="text-xs text-slate-600">{new Date(a.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {rows.length === 0 ? <div className="text-sm text-slate-600">No activity yet.</div> : null}
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
