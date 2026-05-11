import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export type ActivityLogRecord = {
  activityId: string;
  estateId: string;
  type: string;
  message: string;
  createdAt: string;
};

function rowToActivity(row: Record<string, unknown>): ActivityLogRecord {
  return {
    activityId: row.activity_id as string,
    estateId: row.estate_id as string,
    type: row.type as string,
    message: row.message as string,
    createdAt: row.created_at as string,
  };
}

export function newActivityId() {
  return `alog_${nanoid(12)}`;
}

export async function putActivityLog(params: {
  estateId: string;
  type: string;
  message: string;
  createdAtIso?: string;
}): Promise<ActivityLogRecord> {
  const sb = getSupabaseAdmin();
  const createdAt = params.createdAtIso ?? new Date().toISOString();

  const { data, error } = await sb
    .from("activity_logs")
    .insert({
      activity_id: newActivityId(),
      estate_id: params.estateId,
      type: params.type,
      message: params.message,
      created_at: createdAt,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToActivity(data);
}

export async function listActivityLogsForEstate(params: {
  estateId: string;
  limit?: number;
}): Promise<ActivityLogRecord[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("activity_logs")
    .select()
    .eq("estate_id", params.estateId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (error || !data) return [];
  return data.map(rowToActivity);
}

export async function listActivityLogsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: unknown;
}): Promise<{ items: ActivityLogRecord[]; nextCursor: undefined }> {
  const items = await listActivityLogsForEstate(params);
  return { items, nextCursor: undefined };
}
