import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ShiftType = "DAY" | "NIGHT";

export type GateRecord = {
  gateId: string;
  estateId: string;
  name: string;
  shiftType?: ShiftType;
  shiftStartHour?: number;
  shiftEndHour?: number;
  createdAt: string;
  updatedAt: string;
};

function rowToGate(row: Record<string, unknown>): GateRecord {
  return {
    gateId: row.gate_id as string,
    estateId: row.estate_id as string,
    name: row.name as string,
    shiftType: (row.shift_type as ShiftType) ?? undefined,
    shiftStartHour: (row.shift_start_hour as number) ?? undefined,
    shiftEndHour: (row.shift_end_hour as number) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getGateById(gateId: string): Promise<GateRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("gates")
    .select()
    .eq("gate_id", gateId)
    .single();

  if (error || !data) return null;
  return rowToGate(data);
}

export async function listGatesForEstate(estateId: string): Promise<GateRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("gates")
    .select()
    .eq("estate_id", estateId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error || !data) return [];
  return data.map(rowToGate);
}

export async function createGate(params: { estateId: string; name: string }) {
  const existing = await listGatesForEstate(params.estateId);
  const normalized = params.name.trim().toLowerCase();
  if (existing.some((g) => g.name.trim().toLowerCase() === normalized)) {
    return { ok: false as const, error: "Gate already exists" };
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("gates")
    .insert({
      estate_id: params.estateId,
      name: params.name.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return { ok: true as const, gate: rowToGate(data) };
}

export async function updateGateName(params: { gateId: string; name: string }): Promise<GateRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("gates")
    .update({ name: params.name.trim(), updated_at: new Date().toISOString() })
    .eq("gate_id", params.gateId)
    .select()
    .single();

  if (error || !data) return null;
  return rowToGate(data);
}

export async function deleteGate(gateId: string) {
  const sb = getSupabaseAdmin();
  await sb.from("gates").delete().eq("gate_id", gateId);
}
