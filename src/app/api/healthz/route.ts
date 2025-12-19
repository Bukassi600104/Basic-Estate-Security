import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Lightweight DB liveness check.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    // Keep response user-safe.
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
