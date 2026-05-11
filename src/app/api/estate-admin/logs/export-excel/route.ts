import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { listFilteredValidationLogs, type LogFilters } from "@/lib/repos/validation-logs";
import { getEstateById } from "@/lib/repos/estates";

export async function GET(req: Request) {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  try {
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

    const estate = await getEstateById(estateId);
    const estateName = estate?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "estate";

    const logs = await listFilteredValidationLogs({ estateId, filters, limit: 1000 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "GateKeep";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Validation Logs", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Time", key: "time", width: 10 },
      { header: "Gate", key: "gate", width: 15 },
      { header: "Shift", key: "shift", width: 10 },
      { header: "Event", key: "event", width: 10 },
      { header: "House Number", key: "houseNumber", width: 15 },
      { header: "Resident Name", key: "residentName", width: 20 },
      { header: "Pass Type", key: "passType", width: 12 },
      { header: "Guests", key: "guestCount", width: 8 },
      { header: "Outcome", key: "outcome", width: 12 },
      { header: "Failure Reason", key: "failureReason", width: 25 },
      { header: "Guard Name", key: "guardName", width: 20 },
      { header: "Guard Phone", key: "guardPhone", width: 15 },
      { header: "Code", key: "code", width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    logs.forEach((log) => {
      const dt = new Date(log.validatedAt);
      const row = worksheet.addRow({
        date: dt.toLocaleDateString(),
        time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        gate: log.gateName || "",
        shift: log.shiftType || "—",
        event: log.eventType || "ENTRY",
        houseNumber: log.houseNumber || "",
        residentName: log.residentName || "",
        passType: log.passType || "",
        guestCount: log.guestCount ?? 1,
        outcome: log.outcome,
        failureReason: log.failureReason || "",
        guardName: log.guardName || "",
        guardPhone: log.guardPhone || "",
        code: log.codeValue,
      });

      const outcomeCell = row.getCell("outcome");
      if (log.outcome === "SUCCESS") {
        outcomeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
        outcomeCell.font = { color: { argb: "FF065F46" } };
      } else {
        outcomeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
        outcomeCell.font = { color: { argb: "FF991B1B" } };
      }
    });

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (i % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber !== 10) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
        });
      }
    }

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    worksheet.autoFilter = {
      from: "A1",
      to: `N${worksheet.rowCount}`,
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${estateName}_validations_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel file" },
      { status: 500 }
    );
  }
}
