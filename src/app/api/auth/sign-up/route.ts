import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie, signSession } from "@/lib/auth/session";
import { z } from "zod";

const bodySchema = z.object({
  estateName: z.string().min(2),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { estateName, adminName, email, password } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const estate = await prisma.estate.create({
    data: {
      name: estateName,
      activity: {
        create: {
          type: "ESTATE_CREATED",
          message: `Estate created: ${estateName}`,
        },
      },
    },
  });

  const user = await prisma.user.create({
    data: {
      estateId: estate.id,
      role: "ESTATE_ADMIN",
      name: adminName,
      email,
      passwordHash,
    },
  });

  await prisma.activityLog.create({
    data: {
      estateId: estate.id,
      type: "USER_CREATED",
      message: `Estate admin created: ${adminName}`,
    },
  });

  const token = await signSession({
    sub: user.id,
    role: user.role,
    estateId: estate.id,
    name: user.name,
  });
  setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
