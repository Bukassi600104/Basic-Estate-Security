import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getEstateById } from "@/lib/repos/estates";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";

export async function GET(_req: Request, { params }: { params: { estateId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const estate = await getEstateById(params.estateId);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }

  const logs = await listValidationLogsForEstate({ estateId: params.estateId, limit: 2000 });

  const escapeCsv = (value: unknown) => {
    const s = value == null ? "" : String(value);
    const needs = /[\n\r,\"]/g.test(s);
    const escaped = s.replace(/"/g, '""');
    return needs ? `"${escaped}"` : escaped;
  };

  const header = [
    "validatedAt",
    "gateName",
    "houseNumber",
    "residentName",
    "passType",
    "outcome",
    "decision",
    "failureReason",
    "guardName",
    "guardPhone",
    "codeValue",
  ];

  const rows = logs.map((l) => [
    l.validatedAt,
    l.gateName,
    l.houseNumber ?? "",
    l.residentName ?? "",
    l.passType ?? "",
    l.outcome,
    l.decision,
    l.failureReason ?? "",
    l.guardName ?? "",
    l.guardPhone ?? "",
    l.codeValue,
  ]);

  const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=${estate.estateId}_validations.csv`,
    },
  });
}
