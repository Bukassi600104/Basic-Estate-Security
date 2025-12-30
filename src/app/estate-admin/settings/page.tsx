"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";

type EstateStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";

type Estate = {
  id: string;
  name: string;
  address: string | null;
  status: EstateStatus;
};

type AccessLinks = {
  resident: string;
  security: string;
};

export default function EstateSettingsPage() {
  const [estate, setEstate] = useState<Estate | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessLinks, setAccessLinks] = useState<AccessLinks | null>(null);
  const [generatingLinks, setGeneratingLinks] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/estate");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load estate");
      setEstate(data.estate);
      setAddress(data.estate?.address ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load estate");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(partial: Partial<{ status: EstateStatus; address: string }>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/estate-admin/estate", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(partial),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update estate");
      setEstate(data.estate);
      setAddress(data.estate?.address ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update estate");
    } finally {
      setSaving(false);
    }
  }

  async function generateAccessLinks() {
    setGeneratingLinks(true);
    setError(null);
    setCopied(null);
    try {
      const res = await fetch("/api/estate-admin/pwa-links", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to generate links");

      const links = data.links as AccessLinks | undefined;
      if (!links?.resident || !links?.security) {
        throw new Error("Unexpected response");
      }
      setAccessLinks(links);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate links");
    } finally {
      setGeneratingLinks(false);
    }
  }

  async function copyToClipboard(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Settings</h1>
          <p className="text-sm text-slate-600">Manage estate status and basic details.</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <Spinner className="text-slate-500" />
            Loading…
          </div>
        ) : estate ? (
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Estate</div>
              <div className="mt-2 text-sm text-slate-700">
                <div>
                  <span className="font-semibold">Name:</span> {estate.name}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Status:</span> {estate.status}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Address</div>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Estate address"
                  className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none ring-blue-600/20 focus:ring-4"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save({ address })}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Spinner className="text-white" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Estate status</div>
              <p className="mt-1 text-sm text-slate-600">
                Suspended estates block all resident and security portal access. Terminated is permanent.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {estate.status !== "ACTIVE" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save({ status: "ACTIVE" })}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save({ status: "SUSPENDED" })}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                  >
                    Suspend
                  </button>
                )}

                {estate.status !== "TERMINATED" ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (!confirm("Terminate estate? This blocks all access permanently.")) return;
                      save({ status: "TERMINATED" });
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Terminate
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Dashboard Access Links</div>
              <p className="mt-1 text-sm text-slate-600">
                Generate access links for residents and security guards. Share these links via email to grant dashboard access. Regenerating will revoke previous links.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={generatingLinks || saving}
                  onClick={generateAccessLinks}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {generatingLinks ? (
                    <>
                      <Spinner className="text-white" />
                      Generating…
                    </>
                  ) : (
                    "Generate access links"
                  )}
                </button>
              </div>

              {accessLinks ? (
                <div className="mt-4 grid gap-3">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Resident Portal Link</div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      readOnly
                      value={accessLinks.resident}
                      className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard("resident", accessLinks.resident)}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
                    >
                      {copied === "resident" ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Security Portal Link</div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      readOnly
                      value={accessLinks.security}
                      className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard("security", accessLinks.security)}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
                    >
                      {copied === "security" ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                    These links are permanent and will remain active as long as the estate is active.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm text-slate-600">Estate not found.</div>
        )}
      </div>
    </div>
  );
}
