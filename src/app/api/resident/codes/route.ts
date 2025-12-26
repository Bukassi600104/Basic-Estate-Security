import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import {
  enforceSameOriginOr403,
  requireActiveEstateForCurrentUser,
  requireCurrentUserResidentContext,
  requireCurrentUserWithRoles,
} from "@/lib/auth/guards";
import { getResidentById } from "@/lib/repos/residents";
import { createCode, listCodesForResident } from "@/lib/repos/codes";

const createSchema = z.object({
  type: z.enum(["GUEST", "STAFF"]),
});

const GUEST_TTL_MS = 6 * 60 * 60 * 1000;
const STAFF_TTL_MS = 183 * 24 * 60 * 60 * 1000;

function toIso(d: Date) {
  return d.toISOString();
}

function now() {
  return new Date();
}

export async function GET() {
  const userRes = await requireCurrentUserWithRoles({ roles: ["RESIDENT", "RESIDENT_DELEGATE"] });
  if (!userRes.ok) return userRes.response;

  const ctx = requireCurrentUserResidentContext(userRes.value);
  if (!ctx.ok) return ctx.response;

  const active = requireActiveEstateForCurrentUser(userRes.value);
  if (!active.ok) return active.response;

  const resident = await getResidentById(ctx.value.residentId);
  if (!resident || resident.estateId !== ctx.value.estateId) {
    return NextResponse.json({ error: "Missing resident context" }, { status: 400 });
  }

  const codes = await listCodesForResident({ estateId: ctx.value.estateId, residentId: resident.residentId, limit: 200 });

  return NextResponse.json({
    ok: true,
    codes: codes.map((c) => ({
      id: c.codeId,
      type: c.passType,
      status: c.status,
      code: c.codeValue,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const userRes = await requireCurrentUserWithRoles({ roles: ["RESIDENT", "RESIDENT_DELEGATE"] });
  if (!userRes.ok) return userRes.response;

  const ctx = requireCurrentUserResidentContext(userRes.value);
  if (!ctx.ok) return ctx.response;

  const active = requireActiveEstateForCurrentUser(userRes.value);
  if (!active.ok) return active.response;

  const resident = await getResidentById(ctx.value.residentId);
  if (!resident || resident.estateId !== ctx.value.estateId) {
    return NextResponse.json({ error: "Missing resident context" }, { status: 400 });
  }
  if (resident.status !== "APPROVED") {
    return NextResponse.json({ error: "Resident suspended" }, { status: 403 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `resident:codes:create:${ip}:${userRes.value.id}`,
    limit: 30,
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

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const type = parsed.data.type;
  const base = now();
  const expiresAtIso =
    type === "GUEST" ? toIso(new Date(base.getTime() + GUEST_TTL_MS)) : toIso(new Date(base.getTime() + STAFF_TTL_MS));

  await createCode({
    estateId: ctx.value.estateId,
    residentId: resident.residentId,
    passType: type,
    expiresAtIso,
  });

  return NextResponse.json({ ok: true });
}
