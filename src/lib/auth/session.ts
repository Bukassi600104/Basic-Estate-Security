import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "bs_session";

export type SessionClaims = {
  sub: string;
  role: string;
  estateId?: string;
  name: string;
};

function getKey() {
  const { AUTH_JWT_SECRET } = getEnv();
  return new TextEncoder().encode(AUTH_JWT_SECRET);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT({ role: claims.role, estateId: claims.estateId, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getKey());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getKey());
  const sub = payload.sub;
  if (!sub) throw new Error("Invalid session");

  return {
    userId: sub,
    role: String(payload.role ?? ""),
    estateId: payload.estateId ? String(payload.estateId) : undefined,
    name: String(payload.name ?? ""),
  };
}

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
