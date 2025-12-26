import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  enforceSameOriginOr403,
  requireActiveEstate,
  requireEstateId,
  requireRoleSession,
} from "@/lib/auth/guards";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
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
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estateRes = await requireActiveEstate(estateId);
  if (!estateRes.ok) return estateRes.response;

  const baseUrl = baseUrlFromHeaders();
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing host" }, { status: 400 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:pwa-links:${ip}:${sessionRes.value.userId}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const links = await createNewPwaLinks({
    estateId,
    createdByUserId: sessionRes.value.userId,
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
