import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  void req;

  const logs = await listValidationLogsForEstate({ estateId: session.estateId, limit: 500 });

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
      "content-disposition": "attachment; filename=validations.csv",
    },
  });
}
