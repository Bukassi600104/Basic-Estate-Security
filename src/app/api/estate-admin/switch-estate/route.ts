import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { requireRoleSession } from "@/lib/auth/guards";
import { listAdminEstateAccess } from "@/lib/repos/users";
import { getEstateById } from "@/lib/repos/estates";

const bodySchema = z.object({
  estateId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN", "SUB_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const access = await listAdminEstateAccess({ userId: sessionRes.value.userId });
  if (!access.some((item) => item.estateId === parsed.data.estateId)) {
    return NextResponse.json({ error: "Estate not available for this account" }, { status: 403 });
  }

  const estate = await getEstateById(parsed.data.estateId);
  if (!estate) return NextResponse.json({ error: "Estate not found" }, { status: 404 });

  cookies().set("gatepilot_estate_id", parsed.data.estateId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, estate: { id: estate.estateId, name: estate.name } });
}
