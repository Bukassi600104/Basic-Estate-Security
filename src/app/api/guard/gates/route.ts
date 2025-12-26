import { NextResponse } from "next/server";
import {
  requireActiveEstateForCurrentUser,
  requireCurrentUserEstateId,
  requireCurrentUserWithRoles,
} from "@/lib/auth/guards";
import { listGatesForEstate } from "@/lib/repos/gates";

export async function GET() {
  const userRes = await requireCurrentUserWithRoles({ roles: ["GUARD"] });
  if (!userRes.ok) return userRes.response;
  const user = userRes.value;

  const estateIdRes = requireCurrentUserEstateId(user);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const active = requireActiveEstateForCurrentUser(user);
  if (!active.ok) return active.response;

  const gates = await listGatesForEstate(estateId);
  return NextResponse.json({
    ok: true,
    gates: gates.map((g) => ({ id: g.gateId, name: g.name })),
  });
}
