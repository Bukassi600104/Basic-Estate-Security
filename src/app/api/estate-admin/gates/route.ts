import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getEstateById } from "@/lib/repos/estates";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { createGate, listGatesForEstate } from "@/lib/repos/gates";
import { putActivityLog } from "@/lib/repos/activity-logs";

const createSchema = z.object({ name: z.string().min(2).max(50) });

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const gates = await listGatesForEstate(session.estateId);
  return NextResponse.json({
    ok: true,
    gates: gates.map((g) => ({ id: g.gateId, name: g.name })),
  });
}

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({ key: `estate-admin:gates:create:${session.estateId}:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const estate = await getEstateById(session.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate not active" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const created = await createGate({ estateId: session.estateId, name: parsed.data.name });
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 409 });
  }

  await putActivityLog({
    estateId: session.estateId,
    type: "GATE_CREATED",
    message: created.gate.name,
  });

  return NextResponse.json({ ok: true, gate: { id: created.gate.gateId, name: created.gate.name } });
}
