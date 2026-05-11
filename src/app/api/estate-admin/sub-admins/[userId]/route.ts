import { NextResponse } from "next/server";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserById, deleteUser } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";

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

    if (subAdmin.estateId !== estateId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

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

    if (subAdmin.estateId !== estateId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (subAdmin.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "User is not a sub-admin" }, { status: 400 });
    }

    try {
      const sbAdmin = getSupabaseAdmin();
      await sbAdmin.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.error("Failed to delete sub-admin from auth:", authErr);
    }

    await deleteUser(userId);

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
