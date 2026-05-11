import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "This sign-in method has been removed. Use the main Supabase sign-in." },
    { status: 410 },
  );
}
