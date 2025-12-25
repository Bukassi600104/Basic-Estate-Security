import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "bs_session";

export type SessionClaims = {
  sub: string;
  role: string;
  estateId?: string;
  name: string;
};

type CognitoTokenClaims = {
  sub?: string;
  name?: string;
  "cognito:username"?: string;
  "cognito:groups"?: string[];
  "custom:role"?: string;
  "custom:estateId"?: string;
  "custom:residentId"?: string;
};

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (cachedJwks) return cachedJwks;
  const { AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_USER_POOL_REGION } = getEnv();
  const region = COGNITO_USER_POOL_REGION ?? AWS_REGION;
  const url = new URL(
    `https://cognito-idp.${region}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  );
  cachedJwks = createRemoteJWKSet(url);
  return cachedJwks;
}

export async function verifySession(token: string) {
  const env = getEnv();
  const region = env.COGNITO_USER_POOL_REGION ?? env.AWS_REGION;
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${env.COGNITO_USER_POOL_ID}`;

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    audience: env.COGNITO_CLIENT_ID,
  });

  const typed = payload as unknown as CognitoTokenClaims;
  const sub = payload.sub;
  if (!sub) throw new Error("Invalid session");

  const roleFromGroups = Array.isArray(typed["cognito:groups"]) ? typed["cognito:groups"][0] : undefined;
  const role = String(typed["custom:role"] ?? roleFromGroups ?? "");
  const estateId = typed["custom:estateId"] ? String(typed["custom:estateId"]) : undefined;
  const name = String(typed.name ?? typed["cognito:username"] ?? "");

  return {
    userId: sub,
    role,
    estateId,
    name,
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

export function setSessionCookieWithOptions(
  token: string,
  options: {
    rememberMe?: boolean;
  } = {},
) {
  const rememberMe = options.rememberMe ?? true;

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // If rememberMe is false, omit maxAge so the cookie becomes a session cookie.
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
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
