import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { getEstateById } from "@/lib/repos/estates";
import { createNewPwaLinks } from "@/lib/repos/pwa-invites";

function baseUrlFromHeaders() {
  const h = headers();
  const forwardedProto = h.get("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : "https";
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ? forwardedHost.split(",")[0].trim() : h.get("host");
  if (!host) return null;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const baseUrl = baseUrlFromHeaders();
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing host" }, { status: 400 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({
    key: `estate-admin:pwa-links:${ip}:${session.userId}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const links = await createNewPwaLinks({
    estateId: session.estateId,
    createdByUserId: session.userId,
    expiresAtIso: expiresAt.toISOString(),
  });

  return NextResponse.json({
    ok: true,
    links: {
      resident: `${baseUrl}/resident-app/claim?token=${links.residentToken}`,
      security: `${baseUrl}/security-app/claim?token=${links.securityToken}`,
      expiresAt,
    },
  });
}
