import { NextResponse } from "next/server";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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

    try {
      const sbAdmin = getSupabaseAdmin();
      await sbAdmin.auth.admin.deleteUser(guardId);
    } catch (authError) {
      console.error("Failed to delete guard from auth:", authError);
    }

    await deleteUser(guardId);

    await putActivityLog({
      estateId,
      type: "GUARD_DELETED",
      message: `${guard.name} (${guard.email || guard.phone})`,
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
