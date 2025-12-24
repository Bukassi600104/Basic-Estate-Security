import { headers } from "next/headers";

function normalizeHost(host: string) {
  return host.trim().toLowerCase();
}

function getExpectedOrigin() {
  const h = headers();
  const forwardedProto = h.get("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : "http";
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ? forwardedHost.split(",")[0].trim() : h.get("host");
  if (!host) return null;
  return `${proto}://${host}`;
}

/**
 * Basic CSRF mitigation for cookie-authenticated mutations.
 *
 * - If the browser provides `Origin`, it must match the request host.
 * - If `Origin` is missing, but `Sec-Fetch-Site` indicates cross-site, reject.
 * - For non-browser clients (no Origin + no Sec-Fetch-*), allow.
 */
export function enforceSameOriginForMutations(req: Request) {
  const method = req.method.toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (!isMutation) return;

  const h = headers();
  const origin = h.get("origin");
  const secFetchSite = h.get("sec-fetch-site");

  if (!origin) {
    if (secFetchSite === "cross-site") {
      throw new Error("Bad origin");
    }
    return;
  }

  const expected = getExpectedOrigin();
  if (!expected) {
    throw new Error("Bad origin");
  }

  try {
    const o = new URL(origin);
    const e = new URL(expected);

    if (normalizeHost(o.host) !== normalizeHost(e.host)) {
      throw new Error("Bad origin");
    }
    if (o.protocol !== e.protocol) {
      throw new Error("Bad origin");
    }
  } catch {
    throw new Error("Bad origin");
  }
}
