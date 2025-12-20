import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2).optional().or(z.literal("")),
  subscription_plan: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const estate = await prisma.estate.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address ? parsed.data.address.trim() : null,
      activity: {
        create: {
          type: "ESTATE_CREATED",
          message: `Estate created: ${parsed.data.name}`,
        },
      },
    },
  });

  return NextResponse.json({ estate_id: estate.id });
}
