import { randomInt } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export type PassType = "GUEST" | "STAFF";
export type CodeStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
export type EventType = "ENTRY" | "EXIT";

export type CodeRecord = {
  codeId: string;
  estateId: string;
  codeValue: string;
  residentId: string;
  passType: PassType;
  status: CodeStatus;
  eventType?: EventType;
  visitId?: string;
  linkedCodeId?: string;
  guestCount: number;
  guestNames?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  usedAt?: string;
};

function rowToCode(row: Record<string, unknown>): CodeRecord {
  return {
    codeId: row.code_id as string,
    estateId: row.estate_id as string,
    codeValue: row.code_value as string,
    residentId: row.resident_id as string,
    passType: row.pass_type as PassType,
    status: row.status as CodeStatus,
    eventType: (row.event_type as EventType) ?? undefined,
    visitId: (row.visit_id as string) ?? undefined,
    linkedCodeId: (row.linked_code_id as string) ?? undefined,
    guestCount: (row.guest_count as number) ?? 1,
    guestNames: (row.guest_names as string) ?? undefined,
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    usedAt: (row.used_at as string) ?? undefined,
  };
}

function luhnCheckDigit(digits: string): string {
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if ((digits.length - i) % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidLuhnCode(code: string): boolean {
  if (code.length <= 6) return true;
  const payload = code.slice(0, -1);
  const check = code.slice(-1);
  return luhnCheckDigit(payload) === check;
}

function randomNumericCode(length: number) {
  const payloadLen = length - 1;
  const min = 10 ** (payloadLen - 1);
  const max = 10 ** payloadLen;
  const payload = String(randomInt(min, max));
  return payload + luhnCheckDigit(payload);
}

export async function getCodeByValue(params: { estateId: string; codeValue: string }): Promise<CodeRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("codes")
    .select()
    .eq("estate_id", params.estateId)
    .eq("code_value", params.codeValue)
    .single();

  if (error || !data) return null;
  return rowToCode(data);
}

export async function listCodesForResident(params: {
  estateId: string;
  residentId: string;
  limit?: number;
}): Promise<CodeRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("codes")
    .select()
    .eq("estate_id", params.estateId)
    .eq("resident_id", params.residentId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (error || !data) return [];
  return data.map(rowToCode);
}

export async function findCodeById(params: {
  estateId: string;
  residentId: string;
  codeId: string;
}): Promise<CodeRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("codes")
    .select()
    .eq("code_id", params.codeId)
    .eq("estate_id", params.estateId)
    .eq("resident_id", params.residentId)
    .single();

  if (error || !data) return null;
  return rowToCode(data);
}

export async function createCode(params: {
  estateId: string;
  residentId: string;
  passType: PassType;
  expiresAtIso: string;
  eventType?: EventType;
  visitId?: string;
  linkedCodeId?: string;
  guestCount?: number;
  guestNames?: string;
}): Promise<CodeRecord> {
  const sb = getSupabaseAdmin();

  for (let attempt = 0; attempt < 8; attempt++) {
    const codeValue = randomNumericCode(8);

    const { data, error } = await sb
      .from("codes")
      .insert({
        code_id: `code_${nanoid(12)}`,
        estate_id: params.estateId,
        code_value: codeValue,
        resident_id: params.residentId,
        pass_type: params.passType,
        status: "ACTIVE",
        event_type: params.eventType ?? null,
        visit_id: params.visitId ?? null,
        linked_code_id: params.linkedCodeId ?? null,
        guest_count: params.guestCount ?? 1,
        guest_names: params.guestNames ?? null,
        expires_at: params.expiresAtIso,
      })
      .select()
      .single();

    if (!error && data) return rowToCode(data);
    if (error && !error.message.includes("duplicate")) throw error;
  }

  throw new Error("Failed to generate a unique code");
}

export async function createCodePair(params: {
  estateId: string;
  residentId: string;
  expiresAtIso: string;
  guestCount?: number;
  guestNames?: string;
}) {
  const visitId = `visit_${nanoid(12)}`;

  const entryCode = await createCode({
    ...params,
    passType: "GUEST",
    eventType: "ENTRY",
    visitId,
    guestCount: params.guestCount,
    guestNames: params.guestNames,
  });

  const exitCode = await createCode({
    ...params,
    passType: "GUEST",
    eventType: "EXIT",
    visitId,
    linkedCodeId: entryCode.codeId,
    guestCount: params.guestCount,
    guestNames: params.guestNames,
  });

  const sb = getSupabaseAdmin();
  await sb
    .from("codes")
    .update({ linked_code_id: exitCode.codeId })
    .eq("code_id", entryCode.codeId);
  entryCode.linkedCodeId = exitCode.codeId;

  return { entryCode, exitCode, visitId };
}

export async function countActiveCodesForResident(params: {
  estateId: string;
  residentId: string;
  passType?: PassType;
}): Promise<number> {
  const sb = getSupabaseAdmin();
  let query = sb
    .from("codes")
    .select("*", { count: "exact", head: true })
    .eq("estate_id", params.estateId)
    .eq("resident_id", params.residentId)
    .eq("status", "ACTIVE")
    .gt("expires_at", new Date().toISOString());

  if (params.passType) query = query.eq("pass_type", params.passType);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function renewStaffCode(params: {
  codeId: string;
  newExpiresAtIso: string;
}): Promise<CodeRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("codes")
    .update({
      expires_at: params.newExpiresAtIso,
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("code_id", params.codeId)
    .select()
    .single();

  if (error || !data) return null;
  return rowToCode(data);
}

export async function expireActiveCodesForResident(params: {
  estateId: string;
  residentId: string;
  nowIso?: string;
}) {
  const sb = getSupabaseAdmin();
  const now = params.nowIso ?? new Date().toISOString();

  await sb
    .from("codes")
    .update({ status: "EXPIRED", expires_at: now, updated_at: now })
    .eq("estate_id", params.estateId)
    .eq("resident_id", params.residentId)
    .eq("status", "ACTIVE");
}
