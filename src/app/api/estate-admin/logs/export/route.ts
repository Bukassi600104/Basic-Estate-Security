import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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
  const codeType = searchParams.get("type");
  const resident = searchParams.get("resident");

  const where: any = { estateId: session.estateId };
  if (codeType === "GUEST" || codeType === "STAFF") where.passType = codeType;
  if (resident) where.residentName = { contains: resident, mode: "insensitive" };

  if (from || to) {
    where.validatedAt = {};
    if (from) where.validatedAt.gte = new Date(from);
    if (to) where.validatedAt.lte = new Date(to);
  }

  const rows = await prisma.validationLog.findMany({
    where,
    orderBy: { validatedAt: "desc" },
    take: 5000,
    include: { guardUser: { select: { name: true, phone: true } } },
  });

  const header = [
    "validatedAt",
    "gate",
    "outcome",
    "failureReason",
    "decision",
    "passType",
    "residentName",
    "houseNumber",
    "codeValue",
    "guardName",
    "guardPhone",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        r.validatedAt.toISOString(),
        r.gateName ?? "",
        r.outcome,
        r.failureReason ?? "",
        r.decision,
        r.passType ?? "",
        r.residentName ?? "",
        r.houseNumber ?? "",
        r.codeValue,
        r.guardUser?.name ?? "",
        r.guardUser?.phone ?? "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=logs-${session.estateId}.csv`,
    },
  });
}
