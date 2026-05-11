import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ShiftType = "DAY" | "NIGHT";
export type ShiftStatus = "ACTIVE" | "ENDED";

export type GuardShiftRecord = {
  shiftId: string;
  estateId: string;
  guardUserId: string;
  guardName: string;
  gateId: string;
  gateName: string;
  shiftType: ShiftType;
  startedAt: string;
  endedAt?: string;
  status: ShiftStatus;
};

function rowToShift(row: Record<string, unknown>): GuardShiftRecord {
  return {
    shiftId: row.shift_id as string,
    estateId: row.estate_id as string,
    guardUserId: row.guard_user_id as string,
    guardName: row.guard_name as string,
    gateId: row.gate_id as string,
    gateName: row.gate_name as string,
    shiftType: row.shift_type as ShiftType,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string) ?? undefined,
    status: row.status as ShiftStatus,
  };
}

export async function createShift(params: {
  estateId: string;
  guardUserId: string;
  guardName: string;
  gateId: string;
  gateName: string;
  shiftType: ShiftType;
}): Promise<GuardShiftRecord> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("guard_shifts")
    .insert({
      estate_id: params.estateId,
      guard_user_id: params.guardUserId,
      guard_name: params.guardName,
      gate_id: params.gateId,
      gate_name: params.gateName,
      shift_type: params.shiftType,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) throw error;
  return rowToShift(data);
}

export async function endShift(shiftId: string): Promise<GuardShiftRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("guard_shifts")
    .update({ status: "ENDED", ended_at: new Date().toISOString() })
    .eq("shift_id", shiftId)
    .eq("status", "ACTIVE")
    .select()
    .single();

  if (error || !data) return null;
  return rowToShift(data);
}

export async function getShiftById(shiftId: string): Promise<GuardShiftRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("guard_shifts")
    .select()
    .eq("shift_id", shiftId)
    .single();

  if (error || !data) return null;
  return rowToShift(data);
}

export async function getActiveShiftForGuard(guardUserId: string): Promise<GuardShiftRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("guard_shifts")
    .select()
    .eq("guard_user_id", guardUserId)
    .eq("status", "ACTIVE")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return rowToShift(data);
}

export async function endAllActiveShiftsForGuard(guardUserId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  await sb
    .from("guard_shifts")
    .update({ status: "ENDED", ended_at: new Date().toISOString() })
    .eq("guard_user_id", guardUserId)
    .eq("status", "ACTIVE");
}

export async function listShiftsForEstate(params: {
  estateId: string;
  limit?: number;
}): Promise<GuardShiftRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("guard_shifts")
    .select()
    .eq("estate_id", params.estateId)
    .order("started_at", { ascending: false })
    .limit(params.limit ?? 50);

  if (error || !data) return [];
  return data.map(rowToShift);
}
