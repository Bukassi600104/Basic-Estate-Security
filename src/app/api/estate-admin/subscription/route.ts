import { NextResponse } from "next/server";
import { requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { getEstateById } from "@/lib/repos/estates";
import { countAdminsForEstate } from "@/lib/repos/users";
import { listResidentsForEstate } from "@/lib/repos/residents";

/**
 * GET /api/estate-admin/subscription
 * Get subscription details and usage stats
 */
export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN", "SUB_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  try {
    const estate = await getEstateById(estateId);
    if (!estate) {
      return NextResponse.json({ error: "Estate not found" }, { status: 404 });
    }

    // Get usage stats
    const [adminCount, residents] = await Promise.all([
      countAdminsForEstate(estateId),
      listResidentsForEstate(estateId, 1000),
    ]);

    // Count unique house numbers as "houses"
    const uniqueHouses = new Set(residents.map((r) => r.houseNumber)).size;

    return NextResponse.json({
      ok: true,
      estate,
      stats: {
        houses: uniqueHouses,
        admins: adminCount,
      },
    });
  } catch (error) {
    console.error("Failed to get subscription:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to get subscription details" },
      { status: 500 }
    );
  }
}
