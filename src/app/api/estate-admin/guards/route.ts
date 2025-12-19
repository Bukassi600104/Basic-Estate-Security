import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { nanoid } from "nanoid";

const bodySchema = z.object({
  name: z.string().min(2),
  identifier: z.string().min(3), // email or phone
});

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN" || !session.estateId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { name, identifier } = parsed.data;
  const email = isEmail(identifier) ? identifier : null;
  const phone = isEmail(identifier) ? null : identifier;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] },
  });
  if (exists) {
    return NextResponse.json({ error: "Identifier already in use" }, { status: 409 });
  }

  const password = nanoid(12);
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      estateId: session.estateId,
      role: "GUARD",
      name,
      email,
      phone,
      passwordHash,
    },
  });

  await prisma.activityLog.create({
    data: {
      estateId: session.estateId,
      type: "USER_CREATED",
      message: `Guard created: ${name}`,
    },
  });

  return NextResponse.json({
    ok: true,
    credentials: {
      name: user.name,
      identifier: user.email ?? user.phone,
      password,
    },
  });
}
