import { NextResponse } from "next/server";
import { setSessionCookie, verifySession } from "@/lib/auth/session";
import { z } from "zod";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { headers } from "next/headers";
import { cognitoAdminCreateUser, cognitoPasswordSignIn } from "@/lib/aws/cognito";
import { createEstate, deleteEstateById } from "@/lib/repos/estates";
import { putUser } from "@/lib/repos/users";
import { cognitoAdminDeleteUser } from "@/lib/aws/cognito";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const bodySchema = z.object({
  estateName: z.string().min(2),
  estateAddress: z.string().min(2),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const debugId = randomUUID();
  let stage = "init";
  let createdEstateId: string | null = null;
  let createdUsername: string | null = null;

  try {
    stage = "csrf";
    try {
      enforceSameOriginForMutations(req);
    } catch {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({ key: `auth:sign-up:${ip}`, limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

    stage = "parse";
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { estateName, estateAddress, adminName, email, password } = parsed.data;

    // 1) Create estate record.
    stage = "create_estate";
    const estate = await createEstate({ name: estateName, address: estateAddress });
    createdEstateId = estate.estateId;

    // 2) Create Cognito user (no email flow; immediate password set).
    stage = "create_cognito_user";
    try {
      await cognitoAdminCreateUser({
        username: email,
        password,
        email,
        name: adminName,
        userAttributes: {
          "custom:role": "ESTATE_ADMIN",
          "custom:estateId": estate.estateId,
        },
      });
      createdUsername = email;
    } catch {
      // Roll back estate so failed sign-ups don't leave orphan estates.
      await deleteEstateById(estate.estateId).catch(() => null);
      return NextResponse.json({ error: "Unable to create account" }, { status: 409 });
    }

    // 3) Sign in to get IdToken and set cookie.
    stage = "sign_in";
    const tokens = await cognitoPasswordSignIn({ username: email, password });
    setSessionCookie(tokens.idToken);

    // 4) Create Dynamo user profile keyed by Cognito sub.
    stage = "create_profile";
    const session = await verifySession(tokens.idToken);
    const now = new Date().toISOString();
    await putUser({
      userId: session.userId,
      estateId: estate.estateId,
      role: "ESTATE_ADMIN",
      name: adminName,
      email,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const e = error as any;
    const safe = {
      debugId,
      stage,
      name: typeof e?.name === "string" ? e.name : "UnknownError",
      message: typeof e?.message === "string" ? e.message : "Unknown error",
      httpStatusCode: typeof e?.$metadata?.httpStatusCode === "number" ? e.$metadata.httpStatusCode : null,
    };
    console.error("sign_up_failed", JSON.stringify(safe));

    // Common misconfigurations: missing env vars, wrong AWS region, or missing IAM permissions.
    const looksLikeConfigProblem =
      safe.name === "ZodError" ||
      safe.name === "CredentialsProviderError" ||
      safe.name === "UnrecognizedClientException" ||
      safe.name === "AccessDeniedException" ||
      safe.name === "ResourceNotFoundException" ||
      safe.httpStatusCode === 403;

    // Best-effort cleanup if we partially created data.
    if (createdUsername) {
      await cognitoAdminDeleteUser({ username: createdUsername }).catch(() => null);
    }
    if (createdEstateId) {
      await deleteEstateById(createdEstateId).catch(() => null);
    }

    if (looksLikeConfigProblem) {
      return NextResponse.json({ error: "Server not configured", debugId }, { status: 503 });
    }

    return NextResponse.json({ error: "Sign-up failed", debugId }, { status: 500 });
  }
}
