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
    let trialingEstates = 0;
    let paidEstates = 0;
    let expiredTrials = 0;
    let pilotTrials = 0;
    let trialsExpiringSoon = 0;
    let inactiveEstates = 0;
    let estatesWithNoUsers = 0;
    let estatesWithNoValidations = 0;

    const roleDistribution = {
      residents: 0,
      delegates: 0,
      guards: 0,
      estateAdmins: 0,
      subAdmins: 0,
    };

    const estateStatusCounts = {
      active: activeEstates.length,
      suspended: suspendedEstates.length,
      terminated: estates.filter((e) => e.status === "TERMINATED").length,
    };

    const subscriptionStatusCounts: Record<string, number> = {};
    const trialTypeCounts = { standard: 0, pilot: 0 };
    const failureReasons: Record<string, number> = {};
    const passTypeCounts = { guest: 0, staff: 0, unknown: 0 };
    const gateActivity: Record<string, number> = {};
    const topEstatesByValidations: Array<{
      id: string;
      name: string;
      validations: number;
      success: number;
      failed: number;
      users: number;
      residents: number;
      guards: number;
      healthScore: number;
      lastActivityAt: string | null;
    }> = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      subscriptionStatusCounts[estate.subscriptionStatus] = (subscriptionStatusCounts[estate.subscriptionStatus] ?? 0) + 1;
      if (estate.subscriptionStatus === "TRIALING") trialingEstates++;
      if (estate.subscriptionStatus === "ACTIVE") paidEstates++;
      if (estate.subscriptionStatus === "EXPIRED") expiredTrials++;
      if (estate.trialType === "PILOT") pilotTrials++;
      if (estate.trialType === "STANDARD") trialTypeCounts.standard++;
      if (estate.trialType === "PILOT") trialTypeCounts.pilot++;
      if (estate.status !== "ACTIVE") inactiveEstates++;

      const trialEndsAt = new Date(estate.trialEndsAt);
      if (
        estate.subscriptionStatus === "TRIALING" &&
        trialEndsAt.getTime() >= now.getTime() &&
        trialEndsAt.getTime() <= sevenDaysFromNow.getTime()
      ) {
        trialsExpiringSoon++;
      }

      // Get users for this estate
      const users = await listUsersForEstate({ estateId: estate.estateId, limit: 500 });
      if (users.length === 0) estatesWithNoUsers++;
      totalUsers += users.length;
      const residentCount = users.filter((u) => u.role === "RESIDENT").length;
      const delegateCount = users.filter((u) => u.role === "RESIDENT_DELEGATE").length;
      const guardCount = users.filter((u) => u.role === "GUARD").length;
      const adminCount = users.filter((u) => u.role === "ESTATE_ADMIN").length;
      const subAdminCount = users.filter((u) => u.role === "SUB_ADMIN").length;

      roleDistribution.residents += residentCount;
      roleDistribution.delegates += delegateCount;
      roleDistribution.guards += guardCount;
      roleDistribution.estateAdmins += adminCount;
      roleDistribution.subAdmins += subAdminCount;
      totalResidents += residentCount + delegateCount;
      totalGuards += guardCount;
      totalAdmins += adminCount;

      // Get validation logs for this estate
      const validationLogs = await listValidationLogsForEstate({ estateId: estate.estateId, limit: 500 });
      if (validationLogs.length === 0) estatesWithNoValidations++;
      totalValidations += validationLogs.length;
      let estateSuccess = 0;
      let estateFailed = 0;

      for (const log of validationLogs) {
        if (log.outcome === "SUCCESS") {
          successfulValidations++;
          estateSuccess++;
        } else {
          failedValidations++;
          estateFailed++;
          const reason = log.failureReason || "Unknown";
          failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
        }

        if (log.passType === "GUEST") passTypeCounts.guest++;
        else if (log.passType === "STAFF") passTypeCounts.staff++;
        else passTypeCounts.unknown++;

        const gateKey = log.gateName || "Unknown gate";
        gateActivity[gateKey] = (gateActivity[gateKey] ?? 0) + 1;

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

      const validationScore = validationLogs.length > 0 ? Math.round((estateSuccess / validationLogs.length) * 100) : 0;
      const setupScore =
        (residentCount > 0 ? 30 : 0) +
        (guardCount > 0 ? 25 : 0) +
        (adminCount + subAdminCount > 0 ? 20 : 0) +
        (validationLogs.length > 0 ? 25 : 0);
      const healthScore = Math.round((setupScore + validationScore) / (validationLogs.length > 0 ? 2 : 1));

      topEstatesByValidations.push({
        id: estate.estateId,
        name: estate.name,
        validations: validationLogs.length,
        success: estateSuccess,
        failed: estateFailed,
        users: users.length,
        residents: residentCount,
        guards: guardCount,
        healthScore,
        lastActivityAt: validationLogs[0]?.validatedAt ?? null,
      });
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
        trialingEstates,
        paidEstates,
        expiredTrials,
        pilotTrials,
        trialsExpiringSoon,
        inactiveEstates,
        estatesWithNoUsers,
        estatesWithNoValidations,
      },
      charts: {
        dailyValidations: Object.values(dailyValidations),
        roleDistribution: [
          { name: "Residents", value: roleDistribution.residents },
          { name: "Delegates", value: roleDistribution.delegates },
          { name: "Guards", value: roleDistribution.guards },
          { name: "Estate Admins", value: roleDistribution.estateAdmins },
          { name: "Sub Admins", value: roleDistribution.subAdmins },
        ],
        estateStatus: [
          { name: "Active", value: estateStatusCounts.active },
          { name: "Suspended", value: estateStatusCounts.suspended },
          { name: "Terminated", value: estateStatusCounts.terminated },
        ],
        subscriptionStatus: Object.entries(subscriptionStatusCounts).map(([name, value]) => ({ name, value })),
        trialType: [
          { name: "Standard Trial", value: trialTypeCounts.standard },
          { name: "90-Day Pilot", value: trialTypeCounts.pilot },
        ],
        validationOutcomes: [
          { name: "Successful", value: successfulValidations },
          { name: "Failed", value: failedValidations },
        ],
        passTypes: [
          { name: "Guest", value: passTypeCounts.guest },
          { name: "Staff", value: passTypeCounts.staff },
          { name: "Unknown", value: passTypeCounts.unknown },
        ],
        failureReasons: Object.entries(failureReasons)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value })),
        gateActivity: Object.entries(gateActivity)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value })),
        topEstatesByValidations: topEstatesByValidations
          .sort((a, b) => b.validations - a.validations)
          .slice(0, 8),
        estateHealth: topEstatesByValidations
          .sort((a, b) => a.healthScore - b.healthScore)
          .slice(0, 8),
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
