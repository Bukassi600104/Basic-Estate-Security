import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { listEstatesPage, type DdbCursor } from "@/lib/repos/estates";

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

export async function GET(req: Request) {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? "50") || 50));
  const cursor = decodeCursor(url.searchParams.get("cursor"));

  const page = await listEstatesPage({ limit, cursor });

  return NextResponse.json({
    ok: true,
    estates: page.items.map((e) => ({
      id: e.estateId,
      name: e.name,
      status: (e.status === "INACTIVE" ? "SUSPENDED" : e.status) as "ACTIVE" | "SUSPENDED" | "TERMINATED",
      createdAt: e.createdAt,
    })),
    nextCursor: encodeCursor(page.nextCursor),
  });
}
