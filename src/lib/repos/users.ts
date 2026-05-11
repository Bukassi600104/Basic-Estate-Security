import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type UserRole =
  | "SUPER_ADMIN"
  | "ESTATE_ADMIN"
  | "SUB_ADMIN"
  | "GUARD"
  | "RESIDENT"
  | "RESIDENT_DELEGATE";

export type SubAdminPermission =
  | "MANAGE_RESIDENTS"
  | "MANAGE_GUARDS"
  | "VIEW_LOGS"
  | "EXPORT_DATA"
  | "MANAGE_GATES"
  | "VIEW_ANALYTICS";

export const ALL_SUB_ADMIN_PERMISSIONS: SubAdminPermission[] = [
  "MANAGE_RESIDENTS",
  "MANAGE_GUARDS",
  "VIEW_LOGS",
  "EXPORT_DATA",
  "MANAGE_GATES",
  "VIEW_ANALYTICS",
];

export type UserRecord = {
  userId: string;
  estateId?: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  residentId?: string;
  verificationCode?: string;
  passwordChanged?: boolean;
  permissions?: SubAdminPermission[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    userId: row.user_id as string,
    estateId: (row.estate_id as string) ?? undefined,
    role: row.role as UserRole,
    name: row.name as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    residentId: (row.resident_id as string) ?? undefined,
    verificationCode: (row.verification_code as string) ?? undefined,
    passwordChanged: (row.password_changed as boolean) ?? undefined,
    permissions: (row.permissions as SubAdminPermission[]) ?? undefined,
    createdBy: (row.created_by as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function userToRow(user: UserRecord): Record<string, unknown> {
  return {
    user_id: user.userId,
    estate_id: user.estateId ?? null,
    role: user.role,
    name: user.name,
    email: user.email ?? null,
    phone: user.phone ?? null,
    resident_id: user.residentId ?? null,
    verification_code: user.verificationCode ?? null,
    password_changed: user.passwordChanged ?? false,
    permissions: user.permissions ?? null,
    created_by: user.createdBy ?? null,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export async function putUser(user: UserRecord) {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("users").insert(userToRow(user));
  if (error) throw error;
}

export async function upsertUser(user: UserRecord) {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("users").upsert(userToRow(user), { onConflict: "user_id" });
  if (error) throw error;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select()
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return rowToUser(data);
}

export async function listUsersForEstate(params: { estateId: string; limit?: number }): Promise<UserRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select()
    .eq("estate_id", params.estateId)
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 250);

  if (error || !data) return [];
  return data.map(rowToUser);
}

export async function listGuardsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: unknown;
}): Promise<{ items: UserRecord[]; nextCursor: undefined }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select()
    .eq("estate_id", params.estateId)
    .eq("role", "GUARD")
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 50);

  return { items: error || !data ? [] : data.map(rowToUser), nextCursor: undefined };
}

export async function listUsersForResident(params: {
  estateId: string;
  residentId: string;
  limit?: number;
}): Promise<UserRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select()
    .eq("estate_id", params.estateId)
    .eq("resident_id", params.residentId)
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 50);

  if (error || !data) return [];
  return data.map(rowToUser);
}

export async function updateUserResidentId(params: { userId: string; residentId: string | null }) {
  const sb = getSupabaseAdmin();
  await sb
    .from("users")
    .update({ resident_id: params.residentId, updated_at: new Date().toISOString() })
    .eq("user_id", params.userId);
}

export async function findGuardByPhoneInEstate(params: {
  estateId: string;
  phone: string;
}): Promise<UserRecord | null> {
  const normalizedPhone = normalizePhone(params.phone);
  const { items: guards } = await listGuardsForEstatePage({ estateId: params.estateId, limit: 500 });
  return guards.find((g) => g.phone && normalizePhone(g.phone) === normalizedPhone) ?? null;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    return `+234${cleaned.replace(/^0/, "")}`;
  }
  return cleaned;
}

export async function deleteUser(userId: string) {
  const sb = getSupabaseAdmin();
  await sb.from("users").delete().eq("user_id", userId);
}

export async function markPasswordChanged(userId: string) {
  const sb = getSupabaseAdmin();
  await sb
    .from("users")
    .update({ password_changed: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function listSubAdminsForEstate(params: {
  estateId: string;
  limit?: number;
}): Promise<UserRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select()
    .eq("estate_id", params.estateId)
    .eq("role", "SUB_ADMIN")
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 50);

  if (error || !data) return [];
  return data.map(rowToUser);
}

export async function countAdminsForEstate(estateId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("estate_id", estateId)
    .in("role", ["ESTATE_ADMIN", "SUB_ADMIN"]);

  if (error) return 0;
  return count ?? 0;
}

export async function updateSubAdminPermissions(params: {
  userId: string;
  permissions: SubAdminPermission[];
}) {
  const sb = getSupabaseAdmin();
  await sb
    .from("users")
    .update({ permissions: params.permissions, updated_at: new Date().toISOString() })
    .eq("user_id", params.userId);
}

export function hasPermission(user: UserRecord, permission: SubAdminPermission): boolean {
  if (user.role === "ESTATE_ADMIN" || user.role === "SUPER_ADMIN") return true;
  if (user.role === "SUB_ADMIN") return user.permissions?.includes(permission) ?? false;
  return false;
}
