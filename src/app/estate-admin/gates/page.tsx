"use client";

import { useEffect, useState } from "react";

type Gate = {
  id: string;
  name: string;
};

export default function EstateGatesPage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/gates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load gates");
      setGates(data.gates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addGate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/gates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create gate");
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create gate");
    }
  }

  async function deleteGate(gateId: string) {
    if (!confirm("Remove gate?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/estate-admin/gates/${gateId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to remove gate");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove gate");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Gates</h1>
            <p className="mt-1 text-sm text-slate-600">Configure gate names used by the guard bot during validation.</p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        <form className="mt-5 flex flex-col gap-3 md:flex-row" onSubmit={addGate}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gate name (e.g., Main Gate)"
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
            required
            minLength={2}
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            Add gate
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
          >
            Refresh
          </button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Gate</th>
                <th className="py-3 pr-4 text-xs font-extrabold uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-slate-600" colSpan={2}>
                    Loading…
                  </td>
                </tr>
              ) : null}

              {!loading && gates.length === 0 ? (
                <tr>
                  <td className="py-4 text-rose-800" colSpan={2}>
                    No gates configured. Add at least one gate to enable validation in the Security PWA.
                  </td>
                </tr>
              ) : null}

              {gates.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{g.name}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => deleteGate(g.id)}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-900 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
