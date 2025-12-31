import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { listEstates, type EstateRecord } from "@/lib/repos/estates";
import { listUsersForEstate } from "@/lib/repos/users";
import { listValidationLogsForEstate } from "@/lib/repos/validation-logs";

export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  try {
    // Get all estates
    const estates = await listEstates({ limit: 500 });
    const activeEstates = estates.filter((e) => e.status === "ACTIVE");
    const suspendedEstates = estates.filter((e) => e.status === "INACTIVE" || e.status === "SUSPENDED");

    // Aggregate stats across all estates
    let totalUsers = 0;
    let totalResidents = 0;
    let totalGuards = 0;
    let totalAdmins = 0;
    let totalValidations = 0;
    let successfulValidations = 0;
    let failedValidations = 0;
    let todayValidations = 0;
    let weekValidations = 0;
    let monthValidations = 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Daily validation data for chart (last 7 days)
    const dailyValidations: Record<string, { date: string; success: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      dailyValidations[dateStr] = { date: dateStr, success: 0, failed: 0 };
    }

    // Process each estate (limit to first 50 for performance)
    const estatesToProcess = estates.slice(0, 50);

    for (const estate of estatesToProcess) {
      // Get users for this estate
      const users = await listUsersForEstate({ estateId: estate.estateId, limit: 500 });
      totalUsers += users.length;
      totalResidents += users.filter((u) => u.role === "RESIDENT" || u.role === "RESIDENT_DELEGATE").length;
      totalGuards += users.filter((u) => u.role === "GUARD").length;
      totalAdmins += users.filter((u) => u.role === "ESTATE_ADMIN").length;

      // Get validation logs for this estate
      const validationLogs = await listValidationLogsForEstate({ estateId: estate.estateId, limit: 500 });
      totalValidations += validationLogs.length;

      for (const log of validationLogs) {
        if (log.outcome === "SUCCESS") {
          successfulValidations++;
        } else {
          failedValidations++;
        }

        // Time-based counts
        if (log.validatedAt >= todayStart) {
          todayValidations++;
        }
        if (log.validatedAt >= weekAgo) {
          weekValidations++;
        }
        if (log.validatedAt >= monthAgo) {
          monthValidations++;
        }

        // Daily chart data
        const logDate = log.validatedAt.split("T")[0];
        if (dailyValidations[logDate]) {
          if (log.outcome === "SUCCESS") {
            dailyValidations[logDate].success++;
          } else {
            dailyValidations[logDate].failed++;
          }
        }
      }
    }

    const successRate = totalValidations > 0
      ? Math.round((successfulValidations / totalValidations) * 100)
      : 0;

    // Get recent estates for growth chart
    const recentEstates = estates
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      stats: {
        totalEstates: estates.length,
        activeEstates: activeEstates.length,
        suspendedEstates: suspendedEstates.length,
        totalUsers,
        totalResidents,
        totalGuards,
        totalAdmins,
        totalValidations,
        successfulValidations,
        failedValidations,
        todayValidations,
        weekValidations,
        monthValidations,
        successRate,
      },
      charts: {
        dailyValidations: Object.values(dailyValidations),
        estateGrowth: recentEstates.map((e) => ({
          id: e.estateId,
          name: e.name,
          createdAt: e.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
