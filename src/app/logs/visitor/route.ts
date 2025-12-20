import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const residentId = searchParams.get("resident_id");
  const codeType = searchParams.get("code_type");

  const where: any = { estateId: session.estateId };
  if (codeType === "GUEST" || codeType === "STAFF") where.passType = codeType;
  if (from || to) {
    where.validatedAt = {};
    if (from) where.validatedAt.gte = new Date(from);
    if (to) where.validatedAt.lte = new Date(to);
  }

  // We don't store residentId on logs; use snapshot fields.
  if (residentId) {
    const resident = await prisma.resident.findFirst({ where: { id: residentId, estateId: session.estateId } });
    if (!resident) return NextResponse.json({ error: "Not found" }, { status: 404 });
    where.houseNumber = resident.houseNumber;
  }

  const rows = await prisma.validationLog.findMany({
    where,
    orderBy: { validatedAt: "desc" },
    take: 500,
  });

  const logs = rows.map((r) => ({
    log_id: r.id,
    code_value: r.codeValue,
    resident_snapshot: {
      resident_name: r.residentName,
      resident_address: r.houseNumber ? `House ${r.houseNumber}` : null,
      code_type: r.passType,
    },
    validation_datetime: r.validatedAt,
    security_id: r.guardUserId,
    gate_info: r.gateName ?? null,
    outcome: r.outcome,
    failure_reason: r.failureReason ?? null,
  }));

  return NextResponse.json(logs);
}
