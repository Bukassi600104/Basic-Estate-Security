import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ResidentStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export type ResidentRecord = {
  residentId: string;
  estateId: string;
  name: string;
  houseNumber: string;
  status: ResidentStatus;
  phone?: string;
  email?: string;
  verificationCode?: string;
  credentialResetRequested?: boolean;
  credentialResetRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function rowToResident(row: Record<string, unknown>): ResidentRecord {
  return {
    residentId: row.resident_id as string,
    estateId: row.estate_id as string,
    name: row.name as string,
    houseNumber: row.house_number as string,
    status: row.status as ResidentStatus,
    phone: (row.phone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    verificationCode: (row.verification_code as string) ?? undefined,
    credentialResetRequested: (row.credential_reset_requested as boolean) ?? undefined,
    credentialResetRequestedAt: (row.credential_reset_requested_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createResident(params: {
  estateId: string;
  name: string;
  houseNumber: string;
  phone?: string;
  email?: string;
  status?: ResidentStatus;
  verificationCode?: string;
}): Promise<ResidentRecord> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("residents")
    .insert({
      estate_id: params.estateId,
      name: params.name,
      house_number: params.houseNumber,
      status: params.status ?? "APPROVED",
      phone: params.phone ?? null,
      email: params.email ?? null,
      verification_code: params.verificationCode ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToResident(data);
}

export async function listResidentsForEstate(estateId: string, limit = 250): Promise<ResidentRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("residents")
    .select()
    .eq("estate_id", estateId)
    .order("house_number", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map(rowToResident);
}

export async function listResidentsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: unknown;
}): Promise<{ items: ResidentRecord[]; nextCursor: undefined }> {
  const items = await listResidentsForEstate(params.estateId, params.limit);
  return { items, nextCursor: undefined };
}

export async function updateResidentStatus(params: { residentId: string; status: ResidentStatus }) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("residents")
    .update({ status: params.status, updated_at: new Date().toISOString() })
    .eq("resident_id", params.residentId)
    .select()
    .single();

  if (error || !data) return null;
  return rowToResident(data);
}

export async function deleteResident(residentId: string) {
  const sb = getSupabaseAdmin();
  await sb.from("residents").delete().eq("resident_id", residentId);
}

export async function getResidentById(residentId: string): Promise<ResidentRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("residents")
    .select()
    .eq("resident_id", residentId)
    .single();

  if (error || !data) return null;
  return rowToResident(data);
}

export async function findResidentByPhoneInEstate(params: {
  estateId: string;
  phone: string;
}): Promise<ResidentRecord | null> {
  const normalizedPhone = normalizePhone(params.phone);
  const residents = await listResidentsForEstate(params.estateId, 500);
  return residents.find((r) => r.phone && normalizePhone(r.phone) === normalizedPhone) ?? null;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    return `+234${cleaned.replace(/^0/, "")}`;
  }
  return cleaned;
}

export async function requestCredentialReset(residentId: string) {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  await sb
    .from("residents")
    .update({
      credential_reset_requested: true,
      credential_reset_requested_at: now,
      updated_at: now,
    })
    .eq("resident_id", residentId);
}

export async function clearCredentialResetRequest(residentId: string) {
  const sb = getSupabaseAdmin();
  await sb
    .from("residents")
    .update({
      credential_reset_requested: false,
      credential_reset_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("resident_id", residentId);
}

export async function listResidentsWithCredentialResetRequests(estateId: string): Promise<ResidentRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("residents")
    .select()
    .eq("estate_id", estateId)
    .eq("credential_reset_requested", true)
    .order("credential_reset_requested_at", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToResident);
}
