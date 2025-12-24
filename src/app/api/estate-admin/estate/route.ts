import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getEstateById, updateEstate } from "@/lib/repos/estates";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  address: z.string().min(2).max(120).optional().or(z.literal("")),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ estate });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const status = parsed.data.status;
  const address = typeof parsed.data.address === "string" ? parsed.data.address.trim() || null : undefined;

  const estate = await updateEstate({
    estateId: session.estateId,
    status: status ?? undefined,
    address,
  });

  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, estate });
}
