"use client";

import { useEffect, useMemo, useState } from "react";

type ResidentStatus = "PENDING" | "APPROVED" | "SUSPENDED";

type ResidentUser = {
  id: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Resident = {
  id: string;
  name: string;
  houseNumber: string;
  status: ResidentStatus;
  users: ResidentUser[];
};

export default function EstateResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/residents");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load residents");
      setResidents(data.residents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load residents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((r) => {
      const users = r.users
        .map((u) => `${u.name} ${u.phone ?? ""} ${u.email ?? ""} ${u.role}`)
        .join(" ")
        .toLowerCase();
      return `${r.name} ${r.houseNumber} ${r.status}`.toLowerCase().includes(q) || users.includes(q);
    });
  }, [residents, query]);

  async function setStatus(residentId: string, status: "APPROVED" | "SUSPENDED") {
    setError(null);
    try {
      const res = await fetch(`/api/estate-admin/residents/${residentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "SET_STATUS", status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update resident");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update resident");
    }
  }

  async function removeResident(residentId: string) {
    if (!confirm("Remove resident permanently? This cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/estate-admin/residents/${residentId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to remove resident");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove resident");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Residents</h1>
            <p className="mt-1 text-sm text-slate-600">Manage resident status and linked accounts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, unit, phone, email…"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4 md:w-80"
            />
            <button
              type="button"
              onClick={load}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Resident</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Unit</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Status</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Accounts</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={5}>
                    No residents found.
                  </td>
                </tr>
              ) : null}

              {filtered.map((r) => {
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{r.name}</td>
                    <td className="py-3 pr-4 text-slate-700">{r.houseNumber}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          r.status === "APPROVED"
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800"
                            : r.status === "SUSPENDED"
                              ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-800"
                              : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700"
                        }
                      >
                        {r.status === "APPROVED" ? "ACTIVE" : r.status === "SUSPENDED" ? "DISABLED" : r.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      <div className="grid gap-1">
                        {r.users.map((u) => (
                          <div key={u.id} className="text-xs">
                            <span className="font-semibold">{u.role}</span>
                            {u.phone ? <span> · {u.phone}</span> : null}
                            {u.email ? <span> · {u.email}</span> : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Linked accounts: {r.users.length}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {r.status !== "SUSPENDED" ? (
                          <button
                            type="button"
                            onClick={() => setStatus(r.id, "SUSPENDED")}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-800 hover:bg-rose-100"
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStatus(r.id, "APPROVED")}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeResident(r.id)}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
