import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const estateId = searchParams.get("estate_id") ?? session.estateId;
  if (!estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  if (session.role !== "SUPER_ADMIN" && session.estateId !== estateId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const estate = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Billing fields are not modeled yet; return a stable shape.
  return NextResponse.json({
    plan: null,
    tier: null,
    status: estate.status,
    next_payment_due: null,
  });
}
