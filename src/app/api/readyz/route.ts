import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("estates").select("estate_id").limit(1);
    if (error) throw error;

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("/api/readyz failed", error);
    return NextResponse.json(
      { error: "Not ready" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
