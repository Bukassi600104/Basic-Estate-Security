import { NextResponse } from "next/server";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { cognitoAdminDeleteUser } from "@/lib/aws/cognito";
import { getUserById, deleteUser } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";

export async function DELETE(
  req: Request,
  { params }: { params: { guardId: string } }
) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const guardId = params.guardId;

  try {
    // Get the guard to verify they exist and belong to this estate
    const guard = await getUserById(guardId);

    if (!guard) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 });
    }

    if (guard.estateId !== estateId) {
      return NextResponse.json({ error: "Guard not found" }, { status: 404 });
    }

    if (guard.role !== "GUARD") {
      return NextResponse.json({ error: "User is not a guard" }, { status: 400 });
    }

    // Delete from Cognito first (using email or phone as username)
    const cognitoUsername = guard.email || guard.phone;
    if (cognitoUsername) {
      try {
        await cognitoAdminDeleteUser({ username: cognitoUsername });
      } catch (cognitoError) {
        console.error("Failed to delete guard from Cognito:", cognitoError);
        // Continue with DynamoDB deletion even if Cognito fails
      }
    }

    // Delete from DynamoDB
    await deleteUser(guardId);

    // Log activity
    await putActivityLog({
      estateId,
      type: "GUARD_DELETED",
      message: `${guard.name} (${cognitoUsername})`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete guard:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete guard" },
      { status: 500 }
    );
  }
}
