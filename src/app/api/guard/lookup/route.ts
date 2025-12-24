import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { getCodeByValue } from "@/lib/repos/codes";
import { getResidentById } from "@/lib/repos/residents";

const bodySchema = z.object({
  code: z.string().min(3),
});

function isExpired(params: { status: string; expiresAtIso: string; nowIso: string }) {
  if (params.status !== "ACTIVE") return true;
  return params.expiresAtIso <= params.nowIso;
}

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const user = await requireCurrentUser();
  if (!user || user.role !== "GUARD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  if (user.estate?.status !== "ACTIVE") {
    return NextResponse.json({ error: "Estate suspended" }, { status: 403 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({
    key: `guard:lookup:${ip}:${user.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const codeValue = parsed.data.code.trim();

  const code = await getCodeByValue({ estateId: user.estateId, codeValue });
  if (!code || code.estateId !== user.estateId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resident = await getResidentById(code.residentId);
  if (!resident || resident.estateId !== user.estateId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const expired = isExpired({ status: code.status, expiresAtIso: code.expiresAt, nowIso });

  return NextResponse.json({
    ok: true,
    code: {
      id: code.codeId,
      code: code.codeValue,
      type: code.passType,
      status: code.status,
      expiresAt: code.expiresAt,
      expired,
      resident: {
        name: resident.name,
        houseNumber: resident.houseNumber,
        status: resident.status,
      },
    },
  });
}
