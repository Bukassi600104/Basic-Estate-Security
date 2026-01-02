import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import {
  getUserById,
  updateSubAdminPermissions,
  type SubAdminPermission,
  ALL_SUB_ADMIN_PERMISSIONS,
} from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";

const bodySchema = z.object({
  permissions: z.array(z.enum(ALL_SUB_ADMIN_PERMISSIONS as [SubAdminPermission, ...SubAdminPermission[]])),
});

/**
 * PATCH /api/estate-admin/sub-admins/[userId]/permissions
 * Update a sub-admin's permissions
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const { userId } = await params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { permissions } = parsed.data;

  try {
    const subAdmin = await getUserById(userId);

    if (!subAdmin) {
      return NextResponse.json({ error: "Sub-admin not found" }, { status: 404 });
    }

    // Verify they belong to the same estate
    if (subAdmin.estateId !== estateId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify they're a sub-admin
    if (subAdmin.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "User is not a sub-admin" }, { status: 400 });
    }

    // Update permissions
    await updateSubAdminPermissions({
      userId,
      permissions,
    });

    // Log activity
    await putActivityLog({
      estateId,
      type: "SUB_ADMIN_PERMISSIONS_UPDATED",
      message: `${subAdmin.name}: ${permissions.length} permissions`,
    });

    return NextResponse.json({
      ok: true,
      permissions,
    });
  } catch (error) {
    console.error("Failed to update sub-admin permissions:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}
