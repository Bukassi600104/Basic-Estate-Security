import { NextResponse } from "next/server";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { requireEstateId, requireRoleSession } from "@/lib/auth/guards";

export async function GET(req: Request) {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:logs:export:${ip}:${sessionRes.value.userId}:${estateId}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
    );
  }

  void req;

  const logs = await listValidationLogsForEstate({ estateId, limit: 500 });

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
      "cache-control": "no-store, max-age=0",
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=validations.csv",
    },
  });
}
