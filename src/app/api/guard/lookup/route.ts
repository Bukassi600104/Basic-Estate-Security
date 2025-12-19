import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/current-user";

const bodySchema = z.object({
  code: z.string().min(3),
});

export async function POST(req: Request) {
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

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const codeValue = parsed.data.code.trim();

  const code = await prisma.code.findFirst({
    where: {
      estateId: user.estateId,
      code: codeValue,
    },
    include: { resident: true },
  });

  if (!code) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 });
  }

  const now = new Date();
  const expired = now > code.expiresAt;

  return NextResponse.json({
    code: {
      id: code.id,
      code: code.code,
      type: code.type,
      status: code.status,
      expiresAt: code.expiresAt,
      expired,
      resident: {
        name: code.resident.name,
        houseNumber: code.resident.houseNumber,
        status: code.resident.status,
      },
    },
  });
}
