import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { nanoid } from "nanoid";

const createSchema = z.object({
  type: z.enum(["GUEST", "STAFF"]),
});

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function generateCodeValue() {
  return `BS-${nanoid(8).toUpperCase()}`;
}

export async function GET() {
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
    return NextResponse.json({ error: "Resident disabled" }, { status: 403 });
  }

  const codes = await prisma.code.findMany({
    where: {
      estateId: user.estateId,
      residentId: user.residentId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ codes });
}

export async function POST(req: Request) {
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

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const now = new Date();
  const type = parsed.data.type as "GUEST" | "STAFF";
  const expiresAt = type === "GUEST" ? addHours(now, 6) : addDays(now, 183);

  // try a few times for a unique code
  let created = null;
  for (let i = 0; i < 4; i++) {
    const codeValue = generateCodeValue();
    try {
      created = await prisma.code.create({
        data: {
          estateId: user.estateId,
          residentId: user.residentId,
          createdById: user.id,
          type,
          code: codeValue,
          expiresAt,
        },
      });
      break;
    } catch {
      // retry
    }
  }

  if (!created) {
    return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
  }

  await prisma.activityLog.create({
    data: {
      estateId: user.estateId,
      type: "CODE_CREATED",
      message: `${type} code created for House ${user.resident?.houseNumber ?? "?"}`,
    },
  });

  return NextResponse.json({ code: created });
}
