import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getEstateById } from "@/lib/repos/estates";
import { listActivityLogsForEstatePage, type DdbCursor } from "@/lib/repos/activity-logs";

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
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const estate = await getEstateById(params.estateId);
  if (!estate) {
    return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? "50") || 50));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const page = await listActivityLogsForEstatePage({ estateId: params.estateId, limit, cursor });

  return NextResponse.json({
    ok: true,
    activity: page.items,
    nextCursor: encodeCursor(page.nextCursor),
  });
}
