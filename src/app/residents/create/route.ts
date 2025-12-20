import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

const bodySchema = z.object({
  estate_id: z.string().min(1).optional(),
  name: z.string().min(2),
  address: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  telegram_ids: z.array(z.string().min(1)).max(2).optional(),
});

function generatePassword() {
  return nanoid(12);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.estate_id && parsed.data.estate_id !== session.estateId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const estate = await prisma.estate.findUnique({ where: { id: session.estateId } });
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const residentName = parsed.data.name;
  const houseNumber = parsed.data.address;
  const residentPhone = parsed.data.phone;
  const residentEmail = parsed.data.email ? String(parsed.data.email).trim() : "";
  const telegramIds = (parsed.data.telegram_ids ?? []).map((t) => t.trim()).filter(Boolean);

  if (new Set(telegramIds).size !== telegramIds.length) {
    return NextResponse.json({ error: "Duplicate Telegram ID" }, { status: 409 });
  }

  try {
    const residentPassword = generatePassword();
    const residentPasswordHash = await hashPassword(residentPassword);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const resident = await tx.resident.create({
        data: {
          estateId: session.estateId!,
          name: residentName,
          houseNumber,
          primaryPhone: residentPhone,
          email: residentEmail || null,
          status: "APPROVED",
        },
      });

      const residentUser = await tx.user.create({
        data: {
          estateId: session.estateId!,
          role: "RESIDENT",
          name: residentName,
          email: residentEmail || null,
          phone: residentPhone,
          passwordHash: residentPasswordHash,
          residentId: resident.id,
          telegramUserId: telegramIds[0] ?? null,
        },
      });

      if (telegramIds[1]) {
        const delegatePasswordHash = await hashPassword(generatePassword());
        await tx.user.create({
          data: {
            estateId: session.estateId!,
            role: "RESIDENT_DELEGATE",
            name: `${residentName} (Approved #1)`,
            email: null,
            phone: null,
            passwordHash: delegatePasswordHash,
            residentId: resident.id,
            telegramUserId: telegramIds[1],
          },
        });
      }

      await tx.activityLog.create({
        data: {
          estateId: session.estateId!,
          type: "RESIDENT_CREATED",
          message: `Resident created: ${residentName} (House ${houseNumber})`,
        },
      });

      return { resident, residentUser };
    });

    return NextResponse.json({ resident_id: created.resident.id });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return NextResponse.json({ error: "Duplicate value" }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Backend failure" }, { status: 500 });
  }
}
