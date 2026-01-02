import { NextResponse } from "next/server";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { getUserById, deleteUser } from "@/lib/repos/users";
import { cognitoAdminDeleteUser } from "@/lib/aws/cognito";
import { putActivityLog } from "@/lib/repos/activity-logs";
import { getEstateById } from "@/lib/repos/estates";

/**
 * GET /api/estate-admin/sub-admins/[userId]
 * Get a specific sub-admin
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const { userId } = await params;

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

    return NextResponse.json({
      ok: true,
      subAdmin: {
        userId: subAdmin.userId,
        name: subAdmin.name,
        email: subAdmin.email,
        permissions: subAdmin.permissions ?? [],
        createdAt: subAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to get sub-admin:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to get sub-admin" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/estate-admin/sub-admins/[userId]
 * Delete a sub-admin
 */
export async function DELETE(
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

    // Delete from Cognito
    if (subAdmin.email) {
      await cognitoAdminDeleteUser({ username: subAdmin.email }).catch((err) => {
        console.error("Failed to delete sub-admin from Cognito:", err);
      });
    }

    // Delete from DynamoDB
    await deleteUser(userId);

    // Log activity
    await putActivityLog({
      estateId,
      type: "SUB_ADMIN_DELETED",
      message: `${subAdmin.name} (${subAdmin.email})`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete sub-admin:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete sub-admin" },
      { status: 500 }
    );
  }
}
