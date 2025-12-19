import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { nanoid } from "nanoid";

const bodySchema = z.object({
  residentName: z.string().min(2),
  houseNumber: z.string().min(1),
  residentPhone: z.string().min(6),
  residentEmail: z.string().email(),
  approvedPhone1: z.string().min(6).optional().or(z.literal("")),
  approvedPhone2: z.string().min(6).optional().or(z.literal("")),
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

  const estate = await prisma.estate.findUnique({ where: { id: session.estateId } });
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { residentName, houseNumber, residentPhone } = parsed.data;
  const residentEmail = String(parsed.data.residentEmail);

  const approvedPhones = [parsed.data.approvedPhone1, parsed.data.approvedPhone2]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean);

  if (approvedPhones.some((p) => p === residentPhone)) {
    return NextResponse.json({ error: "Approved number cannot match resident phone" }, { status: 400 });
  }

  if (new Set(approvedPhones).size !== approvedPhones.length) {
    return NextResponse.json({ error: "Approved numbers must be unique" }, { status: 400 });
  }

  try {
    // Create resident and login users.
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
          email: residentEmail,
          phone: residentPhone,
          passwordHash: residentPasswordHash,
          residentId: resident.id,
        },
      });

      const delegateResults: Array<{ phone: string; password: string }> = [];

      for (const [index, phone] of approvedPhones.entries()) {
        const password = generatePassword();
        const passwordHash = await hashPassword(password);

        await tx.user.create({
          data: {
            estateId: session.estateId!,
            role: "RESIDENT_DELEGATE",
            name: `${residentName} (Approved #${index + 1})`,
            email: null,
            phone,
            passwordHash,
            residentId: resident.id,
          },
        });

        delegateResults.push({
          phone,
          password,
        });
      }

      await tx.activityLog.create({
        data: {
          estateId: session.estateId!,
          type: "RESIDENT_CREATED",
          message: `Resident onboarded: ${residentName} (House ${houseNumber})`,
        },
      });

      return {
        residentUser,
        residentPassword,
        delegates: delegateResults,
      };
    });

    return NextResponse.json({
      ok: true,
      credentials: {
        resident: {
          name: created.residentUser.name,
          email: created.residentUser.email,
          phone: created.residentUser.phone,
          password: created.residentPassword,
        },
        delegates: created.delegates,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = Array.isArray((err.meta as any)?.target) ? ((err.meta as any).target as string[]) : [];
        const key = target.join(",");

        if (key.includes("houseNumber")) {
          return NextResponse.json({ error: "House number already exists in this estate" }, { status: 409 });
        }
        if (key.includes("primaryPhone")) {
          return NextResponse.json({ error: "Resident phone already exists in this estate" }, { status: 409 });
        }
        if (key.includes("phone")) {
          return NextResponse.json({ error: "Phone already in use" }, { status: 409 });
        }
        if (key.includes("email")) {
          return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }

        return NextResponse.json({ error: "Duplicate value" }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Failed to onboard resident" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await prisma.estate.findUnique({ where: { id: session.estateId } });
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const residents = await prisma.resident.findMany({
    where: { estateId: session.estateId },
    orderBy: { houseNumber: "asc" },
    include: {
      users: {
        select: {
          id: true,
          role: true,
          name: true,
          phone: true,
          email: true,
          telegramUserId: true,
          telegramUsername: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ residents });
}
