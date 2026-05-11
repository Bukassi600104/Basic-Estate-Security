import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { requireEstateExists } from "@/lib/auth/guards";
import { listGuardsForEstatePage } from "@/lib/repos/users";

export async function GET(req: Request, { params }: { params: { estateId: string } }) {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateRes = await requireEstateExists(params.estateId);
  if (!estateRes.ok) return estateRes.response;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? "50") || 50));

  const page = await listGuardsForEstatePage({ estateId: params.estateId, limit });

  return NextResponse.json({
    ok: true,
    guards: page.items.map((u) => ({
      userId: u.userId,
      name: u.name,
      identifier: u.email ?? u.phone ?? "—",
      createdAt: u.createdAt,
    })),
    nextCursor: page.nextCursor,
  });
}
