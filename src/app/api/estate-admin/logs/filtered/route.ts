import { NextResponse } from "next/server";
import { requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { listFilteredValidationLogs, type LogFilters } from "@/lib/repos/validation-logs";

export async function GET(req: Request) {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

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

  const logs = await listFilteredValidationLogs({
    estateId,
    filters,
    limit: 1000,
  });

  return NextResponse.json({
    ok: true,
    logs: logs.map((v) => {
      const dt = new Date(v.validatedAt);
      return {
        id: v.logId,
        validatedAt: v.validatedAt,
        date: dt.toLocaleDateString(),
        time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        gateId: v.gateId,
        gateName: v.gateName,
        shiftType: v.shiftType ?? null,
        eventType: v.eventType ?? "ENTRY",
        visitId: v.visitId ?? null,
        guestCount: v.guestCount ?? 1,
        houseNumber: v.houseNumber ?? null,
        residentName: v.residentName ?? null,
        passType: v.passType ?? null,
        outcome: v.outcome,
        failureReason: v.failureReason ?? null,
        guardName: v.guardName ?? null,
        guardPhone: v.guardPhone ?? null,
        codeValue: v.codeValue,
      };
    }),
    total: logs.length,
  });
}
