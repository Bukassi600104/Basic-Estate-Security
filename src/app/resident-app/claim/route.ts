import { NextResponse } from "next/server";
import crypto from "crypto";
import { getInviteByTokenHash } from "@/lib/repos/pwa-invites";
import { getEstateById } from "@/lib/repos/estates";

function sha256Base64Url(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("base64url");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const now = new Date();
  const tokenHash = sha256Base64Url(token);

  const invite = await getInviteByTokenHash(tokenHash);

  if (!invite || invite.type !== "RESIDENT") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (invite.revokedAt || invite.expiresAt <= now.toISOString()) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const estate = await getEstateById(invite.estateId);
  if (!estate || estate.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const res = NextResponse.redirect(new URL("/resident-app", req.url));
  res.cookies.set("pwa_resident_invite", invite.inviteId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/resident-app",
    maxAge: 60 * 60 * 24 * 180,
  });

  return res;
}
