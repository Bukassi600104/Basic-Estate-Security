import { NextResponse } from "next/server";
import { setSessionCookie, verifySession } from "@/lib/auth/session";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { cognitoPasswordSignIn } from "@/lib/aws/cognito";
import { getUserById } from "@/lib/repos/users";

const bodySchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { identifier, password } = parsed.data;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({
    key: `auth:sign-in:${ip}:${identifier.toLowerCase()}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let tokens;
  try {
    tokens = await cognitoPasswordSignIn({ username: identifier, password });
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Store IdToken in the existing session cookie (Cognito-backed now).
  setSessionCookie(tokens.idToken);

  // Defensive: ensure we have a user profile; if missing, treat as unauthorized.
  const session = await verifySession(tokens.idToken);
  const profile = await getUserById(session.userId);
  if (!profile) {
    return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
