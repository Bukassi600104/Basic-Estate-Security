import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { listEstates } from "@/lib/repos/estates";
import { listValidationLogsForEstate, type ValidationLogRecord } from "@/lib/repos/validation-logs";

export type AlertType = "error" | "warning" | "success" | "info";

export type Alert = {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  estateId?: string;
  estateName?: string;
  details?: Record<string, unknown>;
};

export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  try {
    const alerts: Alert[] = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all estates
    const estates = await listEstates({ limit: 500 });

    // Check for suspended estates
    const suspendedEstates = estates.filter(
      (e) => e.status === "INACTIVE" || e.status === "SUSPENDED"
    );
    for (const estate of suspendedEstates) {
      alerts.push({
        id: `suspended-${estate.estateId}`,
        type: "warning",
        message: `Estate "${estate.name}" is suspended`,
        timestamp: estate.updatedAt,
        estateId: estate.estateId,
        estateName: estate.name,
      });
    }

    // Check for new estates (registered in last 7 days)
    const newEstates = estates.filter((e) => e.createdAt >= last7days);
    for (const estate of newEstates) {
      alerts.push({
        id: `new-estate-${estate.estateId}`,
        type: "success",
        message: `New estate registered: "${estate.name}"`,
        timestamp: estate.createdAt,
        estateId: estate.estateId,
        estateName: estate.name,
      });
    }

    // Collect failed validations from all estates (last 24 hours)
    const failedValidations: (ValidationLogRecord & { estateName: string })[] = [];

    // Limit to first 30 estates for performance
    const estatesToCheck = estates.slice(0, 30);

    for (const estate of estatesToCheck) {
      const logs = await listValidationLogsForEstate({
        estateId: estate.estateId,
        limit: 100,
      });

      const recentFailed = logs.filter(
        (log) => log.outcome === "FAILURE" && log.validatedAt >= last24h
      );

      for (const log of recentFailed) {
        failedValidations.push({ ...log, estateName: estate.name });
      }
    }

    // Sort by most recent and add to alerts
    failedValidations
      .sort((a, b) => b.validatedAt.localeCompare(a.validatedAt))
      .slice(0, 20)
      .forEach((log) => {
        alerts.push({
          id: `failed-${log.logId}`,
          type: "error",
          message: `Failed validation at ${log.estateName}: ${log.failureReason || "Unknown reason"}`,
          timestamp: log.validatedAt,
          estateId: log.estateId,
          estateName: log.estateName,
          details: {
            gateName: log.gateName,
            codeValue: log.codeValue,
            guardName: log.guardName,
          },
        });
      });

    // Sort all alerts by timestamp (most recent first)
    alerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Summary counts
    const summary = {
      totalAlerts: alerts.length,
      errors: alerts.filter((a) => a.type === "error").length,
      warnings: alerts.filter((a) => a.type === "warning").length,
      success: alerts.filter((a) => a.type === "success").length,
      info: alerts.filter((a) => a.type === "info").length,
    };

    return NextResponse.json({
      ok: true,
      alerts: alerts.slice(0, 50), // Limit response size
      summary,
    });
  } catch (error) {
    console.error("Alerts error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
