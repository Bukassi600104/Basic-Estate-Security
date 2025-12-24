import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  void req;
  return NextResponse.json(
    { error: "This endpoint has moved. Use /api/super-admin/estates/:estateId instead." },
    { status: 410 },
  );
}
