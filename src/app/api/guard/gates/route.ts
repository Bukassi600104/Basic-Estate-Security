import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { listGatesForEstate } from "@/lib/repos/gates";

export async function GET() {
  const user = await requireCurrentUser();
  if (!user || user.role !== "GUARD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  if (user.estate?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }

  const gates = await listGatesForEstate(user.estateId);
  return NextResponse.json({
    ok: true,
    gates: gates.map((g) => ({ id: g.gateId, name: g.name })),
  });
}
