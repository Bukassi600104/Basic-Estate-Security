import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";
import { getEstateById } from "@/lib/repos/estates";

export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  try {
    // Get estate info for filename
    const estate = await getEstateById(estateId);
    const estateName = estate?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "estate";

    // Fetch all validation logs
    const logs = await listValidationLogsForEstate({ estateId, limit: 1000 });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Basic Security";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Validation Logs", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    // Define columns with headers
    worksheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Time", key: "time", width: 10 },
      { header: "Gate", key: "gate", width: 15 },
      { header: "House Number", key: "houseNumber", width: 15 },
      { header: "Resident Name", key: "residentName", width: 20 },
      { header: "Pass Type", key: "passType", width: 12 },
      { header: "Outcome", key: "outcome", width: 12 },
      { header: "Failure Reason", key: "failureReason", width: 25 },
      { header: "Guard Name", key: "guardName", width: 20 },
      { header: "Guard Phone", key: "guardPhone", width: 15 },
      { header: "Code", key: "code", width: 12 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" }, // Brand navy
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // Add data rows
    logs.forEach((log) => {
      const dt = new Date(log.validatedAt);
      const row = worksheet.addRow({
        date: dt.toLocaleDateString(),
        time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        gate: log.gateName || "",
        houseNumber: log.houseNumber || "",
        residentName: log.residentName || "",
        passType: log.passType || "",
        outcome: log.outcome,
        failureReason: log.failureReason || "",
        guardName: log.guardName || "",
        guardPhone: log.guardPhone || "",
        code: log.codeValue,
      });

      // Style outcome column based on value
      const outcomeCell = row.getCell("outcome");
      if (log.outcome === "SUCCESS") {
        outcomeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" }, // Light green
        };
        outcomeCell.font = { color: { argb: "FF065F46" } }; // Dark green
      } else {
        outcomeCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" }, // Light red
        };
        outcomeCell.font = { color: { argb: "FF991B1B" } }; // Dark red
      }
    });

    // Add alternating row colors for readability
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (i % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (colNumber !== 7) { // Skip outcome column (already styled)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" }, // Very light gray
            };
          }
        });
      }
    }

    // Add borders to all cells
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

    // Add auto-filter
    worksheet.autoFilter = {
      from: "A1",
      to: `K${worksheet.rowCount}`,
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Generate filename with date
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
