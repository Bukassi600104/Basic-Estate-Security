import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { requireEstateExists } from "@/lib/auth/guards";
import { listValidationLogsForEstatePage } from "@/lib/repos/validation-logs";

export async function GET(req: Request, { params }: { params: { estateId: string } }) {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateRes = await requireEstateExists(params.estateId);
  if (!estateRes.ok) return estateRes.response;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? "50") || 50));

  const page = await listValidationLogsForEstatePage({ estateId: params.estateId, limit });

  return NextResponse.json({
    ok: true,
    validations: page.items,
    nextCursor: page.nextCursor,
  });
}
