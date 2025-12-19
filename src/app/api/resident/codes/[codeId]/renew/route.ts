import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/current-user";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function POST(
  _req: Request,
  { params }: { params: { codeId: string } }
) {
  const user = await requireCurrentUser();
  if (!user || (user.role !== "RESIDENT" && user.role !== "RESIDENT_DELEGATE")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.estateId || !user.residentId) {
    return NextResponse.json({ error: "Missing resident context" }, { status: 400 });
  }

  if (user.estate?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }
  if (user.resident?.status !== "APPROVED") {
    return NextResponse.json({ error: "Resident suspended" }, { status: 403 });
  }

  const code = await prisma.code.findFirst({
    where: {
      id: params.codeId,
      estateId: user.estateId,
      residentId: user.residentId,
    },
  });

  if (!code) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (code.type !== "STAFF") {
    return NextResponse.json({ error: "Only STAFF codes can be renewed" }, { status: 400 });
  }

  const updated = await prisma.code.update({
    where: { id: code.id },
    data: {
      expiresAt: addDays(new Date(), 183),
      status: "ACTIVE",
    },
  });

  await prisma.activityLog.create({
    data: {
      estateId: user.estateId,
      type: "CODE_RENEWED",
      message: `STAFF code renewed for House ${user.resident?.houseNumber ?? "?"}`,
    },
  });

  return NextResponse.json({ code: updated });
}
