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

export const runtime = "nodejs";

const bodySchema = z.object({
  estateName: z.string().min(2),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  let createdEstateId: string | null = null;
  let createdUsername: string | null = null;

  try {
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

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { estateName, adminName, email, password } = parsed.data;

    // 1) Create estate record.
    const estate = await createEstate({ name: estateName });
    createdEstateId = estate.estateId;

    // 2) Create Cognito user (no email flow; immediate password set).
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
    const tokens = await cognitoPasswordSignIn({ username: email, password });
    setSessionCookie(tokens.idToken);

    // 4) Create Dynamo user profile keyed by Cognito sub.
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
    console.error("/api/auth/sign-up failed", error);

    // Best-effort cleanup if we partially created data.
    if (createdUsername) {
      await cognitoAdminDeleteUser({ username: createdUsername }).catch(() => null);
    }
    if (createdEstateId) {
      await deleteEstateById(createdEstateId).catch(() => null);
    }

    return NextResponse.json({ error: "Sign-up failed" }, { status: 500 });
  }
}
