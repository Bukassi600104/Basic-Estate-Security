import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { listFilteredValidationLogs, type LogFilters } from "@/lib/repos/validation-logs";

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

  const { searchParams } = new URL(req.url);
  const filters: LogFilters = {
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    gateId: searchParams.get("gateId") ?? undefined,
    outcome: searchParams.get("outcome") ?? undefined,
    eventType: searchParams.get("eventType") ?? undefined,
    shiftType: searchParams.get("shiftType") ?? undefined,
    houseNumber: searchParams.get("houseNumber") ?? undefined,
    passType: searchParams.get("passType") ?? undefined,
  };

  const logs = await listFilteredValidationLogs({ estateId, filters, limit: 1000 });

  const escapeCsv = (value: unknown) => {
    const s = value == null ? "" : String(value);
    const needs = /[\n\r,\"]/g.test(s);
    const escaped = s.replace(/"/g, '""');
    return needs ? `"${escaped}"` : escaped;
  };

  const header = [
    "validatedAt",
    "gateName",
    "shiftType",
    "eventType",
    "houseNumber",
    "residentName",
    "passType",
    "guestCount",
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
    l.shiftType ?? "",
    l.eventType ?? "ENTRY",
    l.houseNumber ?? "",
    l.residentName ?? "",
    l.passType ?? "",
    String(l.guestCount ?? 1),
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
