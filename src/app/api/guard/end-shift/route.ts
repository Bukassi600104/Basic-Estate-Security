import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  enforceSameOriginOr403,
  requireCurrentUserWithRoles,
  requireCurrentUserEstateId,
} from "@/lib/auth/guards";
import { endShift, getShiftById } from "@/lib/repos/guard-shifts";

const SHIFT_COOKIE = "guard_shift_id";

export async function POST(req: Request) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const guardRes = await requireCurrentUserWithRoles({ roles: ["GUARD"] });
  if (!guardRes.ok) return guardRes.response;

  const estateIdRes = requireCurrentUserEstateId(guardRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;

  const cookieStore = cookies();
  const shiftId = cookieStore.get(SHIFT_COOKIE)?.value;

  if (!shiftId) {
    return NextResponse.json({ error: "No active shift" }, { status: 400 });
  }

  const shift = await getShiftById(shiftId);
  if (!shift || shift.guardUserId !== guardRes.value.id || shift.status !== "ACTIVE") {
    cookieStore.delete(SHIFT_COOKIE);
    return NextResponse.json({ error: "No active shift" }, { status: 400 });
  }

  await endShift(shiftId);
  cookieStore.delete(SHIFT_COOKIE);

  return NextResponse.json({ ok: true });
}
