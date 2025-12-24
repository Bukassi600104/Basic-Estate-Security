import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  void req;
  return NextResponse.json(
    { error: "This endpoint has moved. Use /api/estate-admin/logs instead." },
    { status: 410 },
  );
}
