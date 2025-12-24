import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { getResidentById } from "@/lib/repos/residents";
import { createCode, listCodesForResident } from "@/lib/repos/codes";

const createSchema = z.object({
  type: z.enum(["GUEST", "STAFF"]),
});

const GUEST_TTL_MS = 6 * 60 * 60 * 1000;
const STAFF_TTL_MS = 183 * 24 * 60 * 60 * 1000;

function toIso(d: Date) {
  return d.toISOString();
}

function now() {
  return new Date();
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

  const resident = await getResidentById(user.residentId);
  if (!resident || resident.estateId !== user.estateId) {
    return NextResponse.json({ error: "Missing resident context" }, { status: 400 });
  }

  const codes = await listCodesForResident({ estateId: user.estateId, residentId: resident.residentId, limit: 200 });

  return NextResponse.json({
    ok: true,
    codes: codes.map((c) => ({
      id: c.codeId,
      type: c.passType,
      status: c.status,
      code: c.codeValue,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

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

  const resident = await getResidentById(user.residentId);
  if (!resident || resident.estateId !== user.estateId) {
    return NextResponse.json({ error: "Missing resident context" }, { status: 400 });
  }
  if (resident.status !== "APPROVED") {
    return NextResponse.json({ error: "Resident suspended" }, { status: 403 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({
    key: `resident:codes:create:${ip}:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const type = parsed.data.type;
  const base = now();
  const expiresAtIso =
    type === "GUEST" ? toIso(new Date(base.getTime() + GUEST_TTL_MS)) : toIso(new Date(base.getTime() + STAFF_TTL_MS));

  await createCode({
    estateId: user.estateId,
    residentId: resident.residentId,
    passType: type,
    expiresAtIso,
  });

  return NextResponse.json({ ok: true });
}
