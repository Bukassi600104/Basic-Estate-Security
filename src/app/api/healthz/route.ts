import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Health checks should report whether the web process is up.
  // Database readiness can flap during deploys and should not take the whole service out.
  return NextResponse.json({ ok: true });
}
