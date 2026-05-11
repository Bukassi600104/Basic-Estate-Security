import { NextResponse } from "next/server";
import { requireRoleSession } from "@/lib/auth/guards";
import { listEstatesPage } from "@/lib/repos/estates";

export async function GET(req: Request) {
  const sessionRes = await requireRoleSession({ roles: ["SUPER_ADMIN"] });
  if (!sessionRes.ok) return sessionRes.response;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(200, Number(limitRaw ?? "50") || 50));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const page = await listEstatesPage({ limit, cursor });

  return NextResponse.json({
    ok: true,
    estates: page.items.map((e) => ({
      id: e.estateId,
      name: e.name,
      status: (e.status === "INACTIVE" ? "SUSPENDED" : e.status) as "ACTIVE" | "SUSPENDED" | "TERMINATED",
      createdAt: e.createdAt,
    })),
    nextCursor: page.nextCursor,
  });
}
