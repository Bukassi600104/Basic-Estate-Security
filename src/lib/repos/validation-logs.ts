import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";
import type { PassType, EventType } from "@/lib/repos/codes";
import type { ShiftType } from "@/lib/repos/guard-shifts";

export type ValidationOutcome = "SUCCESS" | "FAILURE";
export type ValidationDecision = "ALLOW" | "DENY";

export type ValidationLogRecord = {
  logId: string;
  estateId: string;
  validatedAt: string;
  gateId: string;
  gateName: string;
  shiftType?: ShiftType;
  shiftId?: string;
  outcome: ValidationOutcome;
  decision: ValidationDecision;
  failureReason?: string;
  passType?: PassType;
  eventType?: EventType;
  visitId?: string;
  guestCount?: number;
  residentName?: string;
  houseNumber?: string;
  codeValue: string;
  guardUserId: string;
  guardName?: string;
  guardPhone?: string;
};

function rowToLog(row: Record<string, unknown>): ValidationLogRecord {
  return {
    logId: row.log_id as string,
    estateId: row.estate_id as string,
    validatedAt: row.validated_at as string,
    gateId: row.gate_id as string,
    gateName: row.gate_name as string,
    shiftType: (row.shift_type as ShiftType) ?? undefined,
    shiftId: (row.shift_id as string) ?? undefined,
    outcome: row.outcome as ValidationOutcome,
    decision: row.decision as ValidationDecision,
    failureReason: (row.failure_reason as string) ?? undefined,
    passType: (row.pass_type as PassType) ?? undefined,
    eventType: (row.event_type as EventType) ?? undefined,
    visitId: (row.visit_id as string) ?? undefined,
    guestCount: (row.guest_count as number) ?? undefined,
    residentName: (row.resident_name as string) ?? undefined,
    houseNumber: (row.house_number as string) ?? undefined,
    codeValue: row.code_value as string,
    guardUserId: row.guard_user_id as string,
    guardName: (row.guard_name as string) ?? undefined,
    guardPhone: (row.guard_phone as string) ?? undefined,
  };
}

export function newValidationLogId() {
  return `vlog_${nanoid(12)}`;
}

export async function putValidationLog(log: ValidationLogRecord) {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("validation_logs").insert({
    log_id: log.logId,
    estate_id: log.estateId,
    validated_at: log.validatedAt,
    gate_id: log.gateId,
    gate_name: log.gateName,
    shift_type: log.shiftType ?? null,
    shift_id: log.shiftId ?? null,
    outcome: log.outcome,
    decision: log.decision,
    failure_reason: log.failureReason ?? null,
    pass_type: log.passType ?? null,
    event_type: log.eventType ?? null,
    visit_id: log.visitId ?? null,
    guest_count: log.guestCount ?? null,
    resident_name: log.residentName ?? null,
    house_number: log.houseNumber ?? null,
    code_value: log.codeValue,
    guard_user_id: log.guardUserId,
    guard_name: log.guardName ?? null,
    guard_phone: log.guardPhone ?? null,
  });

  if (error) throw error;
}

export async function listValidationLogsForEstate(params: {
  estateId: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ValidationLogRecord[]> {
  const sb = getSupabaseAdmin();
  let query = sb
    .from("validation_logs")
    .select()
    .eq("estate_id", params.estateId)
    .order("validated_at", { ascending: false })
    .limit(params.limit ?? 200);

  if (params.dateFrom) query = query.gte("validated_at", params.dateFrom);
  if (params.dateTo) query = query.lte("validated_at", params.dateTo);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(rowToLog);
}

export async function listValidationLogsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: unknown;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ items: ValidationLogRecord[]; nextCursor: undefined }> {
  const items = await listValidationLogsForEstate(params);
  return { items, nextCursor: undefined };
}

export type LogFilters = {
  dateFrom?: string;
  dateTo?: string;
  gateId?: string;
  outcome?: string;
  eventType?: string;
  shiftType?: string;
  houseNumber?: string;
  passType?: string;
};

export async function listFilteredValidationLogs(params: {
  estateId: string;
  filters: LogFilters;
  limit?: number;
}): Promise<ValidationLogRecord[]> {
  const sb = getSupabaseAdmin();
  let query = sb
    .from("validation_logs")
    .select()
    .eq("estate_id", params.estateId)
    .order("validated_at", { ascending: false })
    .limit(params.limit ?? 1000);

  if (params.filters.dateFrom) query = query.gte("validated_at", params.filters.dateFrom);
  if (params.filters.dateTo) query = query.lte("validated_at", params.filters.dateTo);
  if (params.filters.gateId) query = query.eq("gate_id", params.filters.gateId);
  if (params.filters.outcome) query = query.eq("outcome", params.filters.outcome);
  if (params.filters.eventType) query = query.eq("event_type", params.filters.eventType);
  if (params.filters.shiftType) query = query.eq("shift_type", params.filters.shiftType);
  if (params.filters.passType) query = query.eq("pass_type", params.filters.passType);
  if (params.filters.houseNumber) query = query.ilike("house_number", `%${params.filters.houseNumber}%`);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(rowToLog);
}
