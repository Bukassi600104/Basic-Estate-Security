import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { requireEstateExists } from "@/lib/auth/guards";
import { listResidentsForEstatePage, type DdbCursor } from "@/lib/repos/residents";

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function encodeCursor(cursor: DdbCursor | undefined) {
  if (!cursor) return undefined;
  return base64UrlEncode(JSON.stringify(cursor));
}

function decodeCursor(param: string | null): DdbCursor | undefined {
  if (!param) return undefined;
  try {
    return JSON.parse(base64UrlDecode(param)) as DdbCursor;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request, { params }: { params: { estateId: string } }) {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const estateRes = await requireEstateExists(params.estateId);
  if (!estateRes.ok) return estateRes.response;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? "50") || 50));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const page = await listResidentsForEstatePage({ estateId: params.estateId, limit, cursor });

  return NextResponse.json({
    ok: true,
    residents: page.items.map((r) => ({
      residentId: r.residentId,
      name: r.name,
      houseNumber: r.houseNumber,
      status: r.status,
    })),
    nextCursor: encodeCursor(page.nextCursor),
  });
}
