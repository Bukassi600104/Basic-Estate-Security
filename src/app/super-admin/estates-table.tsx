"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EstateRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
};

export function SuperAdminEstatesTable({
  initialEstates,
  initialNextCursor,
}: {
  initialEstates: EstateRow[];
  initialNextCursor: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [estates, setEstates] = useState<EstateRow[]>(initialEstates);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return estates;
    return estates.filter((e) => {
      const hay = `${e.id} ${e.name} ${e.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [estates, query]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setError(null);
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/super-admin/estates?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load more estates");

      const newItems = (data.estates as EstateRow[] | undefined) ?? [];
      const newCursor = (data.nextCursor as string | undefined) ?? null;

      setEstates((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const deduped = newItems.filter((e) => !seen.has(e.id));
        return [...prev, ...deduped];
      });
      setNextCursor(newCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more estates");
    } finally {
      setLoadingMore(false);
    }
  }

  async function setStatus(estateId: string, status: EstateRow["status"]) {
    setError(null);
    setBusyId(estateId);
    try {
      const res = await fetch(`/api/super-admin/estates/${estateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update estate");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update estate");
    } finally {
      setBusyId(null);
    }
  }

  async function terminate(estateId: string) {
    const ok = confirm(
      "Terminate this estate? This is irreversible and revokes all access.\n\nClick OK to continue."
    );
    if (!ok) return;
    await setStatus(estateId, "TERMINATED");
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Estates</h2>
          <p className="mt-1 text-sm text-slate-600">Manage tenants, lifecycle, and access.</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, id, status…"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4 md:w-80"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Estate</th>
              <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Status</th>
              <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Created</th>
              <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const busy = busyId === e.id;
              return (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-extrabold text-slate-900">{e.name}</td>
                  <td className="py-3 pr-4 text-slate-700">{e.status}</td>
                  <td className="py-3 pr-4 text-slate-700">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/super-admin/estates/${e.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                      >
                        View
                      </Link>
                      {e.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(e.id, "SUSPENDED")}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Suspend
                        </button>
                      ) : null}

                      {e.status === "SUSPENDED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(e.id, "ACTIVE")}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reactivate
                        </button>
                      ) : null}

                      {e.status !== "TERMINATED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => terminate(e.id)}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Terminate
                        </button>
                      ) : (
                        <span className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-extrabold text-slate-700">
                          Terminated
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td className="py-4 text-slate-600" colSpan={4}>
                  No estates found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {query.trim() === "" && nextCursor ? (
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
