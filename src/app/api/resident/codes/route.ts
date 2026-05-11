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
import {
  createCode,
  createCodePair,
  countActiveCodesForResident,
  listCodesForResident,
} from "@/lib/repos/codes";

const createSchema = z.object({
  type: z.enum(["GUEST", "STAFF"]),
  guestCount: z.number().int().min(1).max(20).default(1),
  guestNames: z.string().max(500).optional(),
});

const GUEST_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (reduced from 6)
const STAFF_TTL_MS = 183 * 24 * 60 * 60 * 1000;

const MAX_ACTIVE_GUEST_CODES = 10; // 5 pairs = 10 codes
const MAX_ACTIVE_STAFF_CODES = 3;

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
      eventType: c.eventType ?? "ENTRY",
      visitId: c.visitId,
      linkedCodeId: c.linkedCodeId,
      guestCount: c.guestCount ?? 1,
      guestNames: c.guestNames,
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

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const type = parsed.data.type;

  // Tighter rate limits per code type
  const rateLimit = type === "GUEST" ? 10 : 2;
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `resident:codes:create:${type}:${ip}:${userRes.value.id}`,
    limit: rateLimit,
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

  // Enforce max active codes per resident
  const activeCount = await countActiveCodesForResident({
    estateId: ctx.value.estateId,
    residentId: resident.residentId,
    passType: type,
  });

  const maxActive = type === "GUEST" ? MAX_ACTIVE_GUEST_CODES : MAX_ACTIVE_STAFF_CODES;
  if (activeCount >= maxActive) {
    return NextResponse.json(
      { error: `Maximum active ${type.toLowerCase()} codes reached (${maxActive}). Wait for existing codes to expire or be used.` },
      { status: 429 },
    );
  }

  const base = now();
  const expiresAtIso =
    type === "GUEST" ? toIso(new Date(base.getTime() + GUEST_TTL_MS)) : toIso(new Date(base.getTime() + STAFF_TTL_MS));

  if (type === "GUEST") {
    // Create entry + exit code pair
    const { entryCode, exitCode, visitId } = await createCodePair({
      estateId: ctx.value.estateId,
      residentId: resident.residentId,
      expiresAtIso,
      guestCount: parsed.data.guestCount,
      guestNames: parsed.data.guestNames,
    });

    return NextResponse.json({
      ok: true,
      codePair: {
        visitId,
        entryCode: {
          id: entryCode.codeId,
          code: entryCode.codeValue,
          eventType: "ENTRY",
          guestCount: entryCode.guestCount,
          expiresAt: entryCode.expiresAt,
        },
        exitCode: {
          id: exitCode.codeId,
          code: exitCode.codeValue,
          eventType: "EXIT",
          guestCount: exitCode.guestCount,
          expiresAt: exitCode.expiresAt,
        },
      },
    });
  }

  // STAFF codes: single code, no entry/exit
  await createCode({
    estateId: ctx.value.estateId,
    residentId: resident.residentId,
    passType: type,
    expiresAtIso,
    guestCount: parsed.data.guestCount,
    guestNames: parsed.data.guestNames,
  });

  return NextResponse.json({ ok: true });
}
