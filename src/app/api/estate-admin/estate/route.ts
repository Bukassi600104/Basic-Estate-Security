import { NextResponse } from "next/server";
import { z } from "zod";
import { getEstateById, updateEstate } from "@/lib/repos/estates";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { enforceSameOriginOr403, requireEstateId, requireRoleSession } from "@/lib/auth/guards";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  address: z.string().min(2).max(120).optional().or(z.literal("")),
});

export async function GET() {
  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const estate = await getEstateById(estateId);
  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ estate });
}

export async function PATCH(req: Request) {
  const origin = enforceSameOriginOr403(req);
  if (!origin.ok) return origin.response;

  const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateIdRes = requireEstateId(sessionRes.value);
  if (!estateIdRes.ok) return estateIdRes.response;
  const estateId = estateIdRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `estate-admin:estate:patch:${estateId}:${ip}`,
    limit: 30,
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
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const status = parsed.data.status;
  const address = typeof parsed.data.address === "string" ? parsed.data.address.trim() || null : undefined;

  const estate = await updateEstate({
    estateId,
    status: status ?? undefined,
    address,
  });

  if (!estate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, estate });
}
