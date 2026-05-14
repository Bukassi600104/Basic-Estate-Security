import { NextResponse } from "next/server";
import { listEstatesByName } from "@/lib/repos/estates";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ ok: true, estates: [] });
  }

  const estates = await listEstatesByName(name, 10);
  return NextResponse.json({
    ok: true,
    estates: estates
      .filter((estate) => estate.status === "ACTIVE")
      .map((estate) => ({
        id: estate.estateId,
        name: estate.name,
        address: estate.address,
      })),
  });
}
