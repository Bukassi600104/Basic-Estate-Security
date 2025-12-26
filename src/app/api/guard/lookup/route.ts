import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import {
  enforceSameOriginOr403,
  requireActiveEstateForCurrentUser,
  requireCurrentUserEstateId,
  requireCurrentUserWithRoles,
} from "@/lib/auth/guards";
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
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const userRes = await requireCurrentUserWithRoles({ roles: ["GUARD"] });
  if (!userRes.ok) return userRes.response;
  const user = userRes.value;

  const estateIdRes = requireCurrentUserEstateId(user);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const active = requireActiveEstateForCurrentUser(user);
  if (!active.ok) return active.response;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `guard:lookup:${ip}:${user.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const codeValue = parsed.data.code.trim();

  const code = await getCodeByValue({ estateId, codeValue });
  if (!code || code.estateId !== estateId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resident = await getResidentById(code.residentId);
  if (!resident || resident.estateId !== estateId) {
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
