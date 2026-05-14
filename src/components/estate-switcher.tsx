"use client";

import { useRouter } from "next/navigation";

export type EstateSwitchOption = {
  id: string;
  name: string;
  address?: string | null;
};

export function EstateSwitcher({
  estates,
  activeEstateId,
}: {
  estates: EstateSwitchOption[];
  activeEstateId?: string;
}) {
  const router = useRouter();

  if (estates.length <= 1) return null;

  async function onChange(estateId: string) {
    const res = await fetch("/api/estate-admin/switch-estate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ estateId }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <label className="mt-3 block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Switch estate</span>
      <select
        value={activeEstateId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      >
        {estates.map((estate) => (
          <option key={estate.id} value={estate.id}>
            {estate.name}{estate.address ? ` - ${estate.address}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
