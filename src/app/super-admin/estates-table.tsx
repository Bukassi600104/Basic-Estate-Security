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
    return estates.filter((e) => `${e.id} ${e.name} ${e.status}`.toLowerCase().includes(q));
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
        return [...prev, ...newItems.filter((e) => !seen.has(e.id))];
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
      setEstates((prev) => prev.map((estate) => (estate.id === estateId ? { ...estate, status } : estate)));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update estate");
    } finally {
      setBusyId(null);
    }
  }

  async function terminate(estateId: string) {
    const ok = confirm("Terminate this estate? This is irreversible and revokes all access.\n\nClick OK to continue.");
    if (!ok) return;
    await setStatus(estateId, "TERMINATED");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950">All Estates</h2>
          <p className="mt-1 text-sm text-slate-500">Manage tenants, lifecycle, and drilldown access.</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, id, status..."
          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none ring-violet-600/20 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 md:w-80"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-100">
              <TableHead>Estate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </tr>
          </thead>
          <tbody>
            {filtered.map((estate) => {
              const busy = busyId === estate.id;
              return (
                <tr key={estate.id} className="border-b border-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-black text-slate-950">{estate.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-500">{estate.id.slice(0, 12)}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={estate.status} />
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-600">
                    {new Date(estate.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/super-admin/estates/${estate.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-4 text-xs font-black text-violet-700 hover:bg-violet-700 hover:text-white"
                      >
                        View
                      </Link>
                      {estate.status === "ACTIVE" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(estate.id, "SUSPENDED")}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                        >
                          Suspend
                        </button>
                      ) : null}

                      {estate.status === "SUSPENDED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setStatus(estate.id, "ACTIVE")}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Reactivate
                        </button>
                      ) : null}

                      {estate.status !== "TERMINATED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => terminate(estate.id)}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Terminate
                        </button>
                      ) : (
                        <span className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-500">
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
                <td className="py-4 text-slate-500" colSpan={4}>
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
            className="inline-flex h-10 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-5 text-xs font-black text-violet-700 hover:bg-violet-700 hover:text-white disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="py-3 pr-4 text-xs font-black uppercase tracking-widest">{children}</th>;
}

function StatusBadge({ status }: { status: EstateRow["status"] }) {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "SUSPENDED"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${className}`}>{status}</span>;
}
