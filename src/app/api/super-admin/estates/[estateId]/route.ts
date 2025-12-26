import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { headers } from "next/headers";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { requireEstateExists, requireRoleSession } from "@/lib/auth/guards";
import { updateEstate } from "@/lib/repos/estates";
import { putActivityLog } from "@/lib/repos/activity-logs";

const bodySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]),
});

export async function PATCH(req: Request, { params }: { params: { estateId: string } }) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;
  const session = sessionRes.value;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "OPS",
    key: `super-admin:estates:patch:${params.estateId}:${ip}:${session.userId}`,
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existingRes = await requireEstateExists(params.estateId);
  if (!existingRes.ok) return existingRes.response;
  const existing = existingRes.value;

  const updated = await updateEstate({ estateId: params.estateId, status: parsed.data.status });
  if (!updated) {
    return NextResponse.json({ error: "Unable to update estate" }, { status: 409 });
  }

  await putActivityLog({
    estateId: params.estateId,
    type: "ESTATE_STATUS_UPDATED",
    message: `${existing.status} -> ${updated.status}`,
  });

  return NextResponse.json({ ok: true, estate: { id: updated.estateId, status: updated.status } });
}
