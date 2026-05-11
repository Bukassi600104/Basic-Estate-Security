import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import {
  enforceSameOriginOr403,
  requireActiveEstateForCurrentUser,
  requireCurrentUserEstateId,
  requireCurrentUserWithRoles,
} from "@/lib/auth/guards";
import { getCodeByValue, isValidLuhnCode } from "@/lib/repos/codes";
import { getGateById } from "@/lib/repos/gates";
import { getResidentById } from "@/lib/repos/residents";
import { newValidationLogId, putValidationLog } from "@/lib/repos/validation-logs";
import { getShiftById } from "@/lib/repos/guard-shifts";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SHIFT_COOKIE = "guard_shift_id";

const bodySchema = z.object({
  code: z.string().min(3),
});

function denyReason(reason: string) {
  return `Access Denied\nReason: ${reason}`;
}

function nowIso() {
  return new Date().toISOString();
}

function codeExpired(params: { status: string; expiresAt: string; now: string }) {
  if (params.status !== "ACTIVE") return true;
  return params.expiresAt <= params.now;
}

function mapFailureToUserMessage(failureReason: string) {
  switch (failureReason) {
    case "INVALID_CODE": return denyReason("Invalid code");
    case "CODE_EXPIRED": return denyReason("Code expired");
    case "CODE_NOT_ACTIVE": return denyReason("Code not active");
    case "RESIDENT_SUSPENDED": return denyReason("Resident suspended");
    case "GATE_NOT_FOUND": return denyReason("Invalid gate");
    case "NO_ACTIVE_SHIFT": return denyReason("No active shift. Please log in again.");
    case "INVALID_LUHN": return denyReason("Invalid code format");
    default: return denyReason("Invalid or expired code");
  }
}

async function writeFailureLog(params: {
  estateId: string;
  timestamp: string;
  gateId: string;
  gateName: string;
  shiftType?: string;
  shiftId?: string;
  failureReason: string;
  codeValue: string;
  guardUserId: string;
  guardName: string;
  guardPhone?: string;
  passType?: string;
  eventType?: string;
  visitId?: string;
  guestCount?: number;
  residentName?: string;
  houseNumber?: string;
}) {
  await putValidationLog({
    logId: newValidationLogId(),
    estateId: params.estateId,
    validatedAt: params.timestamp,
    gateId: params.gateId,
    gateName: params.gateName,
    shiftType: params.shiftType as "DAY" | "NIGHT" | undefined,
    shiftId: params.shiftId,
    outcome: "FAILURE",
    decision: "DENY",
    failureReason: params.failureReason,
    passType: params.passType as "GUEST" | "STAFF" | undefined,
    eventType: params.eventType as "ENTRY" | "EXIT" | undefined,
    visitId: params.visitId,
    guestCount: params.guestCount,
    residentName: params.residentName,
    houseNumber: params.houseNumber,
    codeValue: params.codeValue,
    guardUserId: params.guardUserId,
    guardName: params.guardName,
    guardPhone: params.guardPhone,
  });
}

export async function POST(req: Request) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const guardRes = await requireCurrentUserWithRoles({ roles: ["GUARD"] });
  if (!guardRes.ok) return guardRes.response;
  const guard = guardRes.value;

  const estateIdRes = requireCurrentUserEstateId(guard);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const active = requireActiveEstateForCurrentUser(guard);
  if (!active.ok) return active.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `guard:validate:${ip}:${guard.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      { status: rl.status, headers: { "Cache-Control": "no-store, max-age=0", ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}) } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const timestamp = nowIso();
  const codeValue = parsed.data.code.trim();

  if (codeValue.length > 6 && !isValidLuhnCode(codeValue)) {
    return NextResponse.json({ error: mapFailureToUserMessage("INVALID_LUHN") }, { status: 400 });
  }

  const cookieStore = cookies();
  const shiftId = cookieStore.get(SHIFT_COOKIE)?.value;
  if (!shiftId) {
    return NextResponse.json({ error: mapFailureToUserMessage("NO_ACTIVE_SHIFT") }, { status: 403 });
  }

  const shift = await getShiftById(shiftId);
  if (!shift || shift.guardUserId !== guard.id || shift.status !== "ACTIVE") {
    return NextResponse.json({ error: mapFailureToUserMessage("NO_ACTIVE_SHIFT") }, { status: 403 });
  }

  const logBase = {
    estateId,
    timestamp,
    gateId: shift.gateId,
    gateName: shift.gateName,
    shiftType: shift.shiftType,
    shiftId: shift.shiftId,
    codeValue,
    guardUserId: guard.id,
    guardName: guard.name,
    guardPhone: guard.phone ?? undefined,
  };

  const gate = await getGateById(shift.gateId);
  if (!gate || gate.estateId !== estateId) {
    await writeFailureLog({ ...logBase, failureReason: "GATE_NOT_FOUND" });
    return NextResponse.json({ error: mapFailureToUserMessage("GATE_NOT_FOUND") }, { status: 400 });
  }

  const code = await getCodeByValue({ estateId, codeValue });
  if (!code || code.estateId !== estateId) {
    await writeFailureLog({ ...logBase, failureReason: "INVALID_CODE" });
    return NextResponse.json({ error: mapFailureToUserMessage("INVALID_CODE") }, { status: 403 });
  }

  const resident = await getResidentById(code.residentId);
  if (!resident || resident.estateId !== estateId) {
    await writeFailureLog({ ...logBase, failureReason: "INVALID_CODE", passType: code.passType, eventType: code.eventType, visitId: code.visitId, guestCount: code.guestCount });
    return NextResponse.json({ error: mapFailureToUserMessage("INVALID_CODE") }, { status: 403 });
  }

  const codeLogBase = { ...logBase, passType: code.passType, eventType: code.eventType, visitId: code.visitId, guestCount: code.guestCount, residentName: resident.name, houseNumber: resident.houseNumber };

  if (resident.status === "SUSPENDED") {
    await writeFailureLog({ ...codeLogBase, failureReason: "RESIDENT_SUSPENDED" });
    return NextResponse.json({ error: mapFailureToUserMessage("RESIDENT_SUSPENDED") }, { status: 403 });
  }

  if (code.status !== "ACTIVE") {
    await writeFailureLog({ ...codeLogBase, failureReason: "CODE_NOT_ACTIVE" });
    return NextResponse.json({ error: mapFailureToUserMessage("CODE_NOT_ACTIVE") }, { status: 403 });
  }

  if (codeExpired({ status: code.status, expiresAt: code.expiresAt, now: timestamp })) {
    await writeFailureLog({ ...codeLogBase, failureReason: "CODE_EXPIRED" });
    return NextResponse.json({ error: mapFailureToUserMessage("CODE_EXPIRED") }, { status: 403 });
  }

  const eventType = code.eventType ?? "ENTRY";

  if (code.passType === "GUEST") {
    const sb = getSupabaseAdmin();
    const { data: consumed, error: consumeError } = await sb.rpc("consume_guest_code", {
      p_code_id: code.codeId,
      p_estate_id: estateId,
      p_used_at: timestamp,
    });

    if (consumeError || consumed !== true) {
      await writeFailureLog({ ...codeLogBase, failureReason: "CODE_NOT_ACTIVE" });
      return NextResponse.json({ error: mapFailureToUserMessage("CODE_NOT_ACTIVE") }, { status: 403 });
    }

    await putValidationLog({
      logId: newValidationLogId(),
      estateId,
      validatedAt: timestamp,
      gateId: gate.gateId,
      gateName: gate.name,
      shiftType: shift.shiftType,
      shiftId: shift.shiftId,
      outcome: "SUCCESS",
      decision: "ALLOW",
      passType: code.passType,
      eventType,
      visitId: code.visitId,
      guestCount: code.guestCount ?? 1,
      residentName: resident.name,
      houseNumber: resident.houseNumber,
      codeValue,
      guardUserId: guard.id,
      guardName: guard.name,
      guardPhone: guard.phone ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      eventType,
      guestCount: code.guestCount ?? 1,
      residentName: resident.name,
      houseNumber: resident.houseNumber,
    });
  }

  // Staff codes: do not expire on validation
  await putValidationLog({
    logId: newValidationLogId(),
    estateId,
    validatedAt: timestamp,
    gateId: gate.gateId,
    gateName: gate.name,
    shiftType: shift.shiftType,
    shiftId: shift.shiftId,
    outcome: "SUCCESS",
    decision: "ALLOW",
    passType: code.passType,
    eventType,
    visitId: code.visitId,
    guestCount: code.guestCount ?? 1,
    residentName: resident.name,
    houseNumber: resident.houseNumber,
    codeValue,
    guardUserId: guard.id,
    guardName: guard.name,
    guardPhone: guard.phone ?? undefined,
  });

  return NextResponse.json({
    ok: true,
    eventType,
    guestCount: code.guestCount ?? 1,
    residentName: resident.name,
    houseNumber: resident.houseNumber,
  });
}
