import { NextResponse } from "next/server";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { requireEstateExists, requireRoleSession } from "@/lib/auth/guards";

export async function GET(_req: Request, { params }: { params: { estateId: string } }) {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;
  const session = sessionRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `super-admin:validations:export:${ip}:${session.userId}:${params.estateId}`,
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

  const estateRes = await requireEstateExists(params.estateId);
  if (!estateRes.ok) return estateRes.response;
  const estate = estateRes.value;

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
      "cache-control": "no-store, max-age=0",
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=${estate.estateId}_validations.csv`,
    },
  });
}
