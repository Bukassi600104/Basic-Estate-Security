import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { getResidentById } from "@/lib/repos/residents";
import { findCodeById, renewStaffCode } from "@/lib/repos/codes";

const STAFF_TTL_MS = 183 * 24 * 60 * 60 * 1000;

export async function POST(
  req: Request,
  { params }: { params: { codeId: string } }
) {
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
    key: `resident:codes:renew:${ip}:${user.id}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const code = await findCodeById({
    estateId: user.estateId,
    residentId: resident.residentId,
    codeId: params.codeId,
  });

  if (!code) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (code.passType !== "STAFF") {
    return NextResponse.json({ error: "Only staff codes can be renewed" }, { status: 400 });
  }

  if (code.status === "REVOKED" || code.status === "USED") {
    return NextResponse.json({ error: "Code cannot be renewed" }, { status: 409 });
  }

  const now = new Date();
  const newExpiresAtIso = new Date(now.getTime() + STAFF_TTL_MS).toISOString();
  await renewStaffCode({ codeKey: code.codeKey, newExpiresAtIso });

  return NextResponse.json({ ok: true });
}
