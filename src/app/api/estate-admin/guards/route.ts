import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimit } from "@/lib/security/rate-limit";
import { cognitoAdminCreateUser, cognitoAdminGetUserSub } from "@/lib/aws/cognito";
import { putUser } from "@/lib/repos/users";
import { putActivityLog } from "@/lib/repos/activity-logs";

const bodySchema = z.object({
  name: z.string().min(2),
  identifier: z.string().min(3),
});

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const rest = Array.from({ length: 10 }, () => pick(upper + lower + digits)).join("");
  return `${pick(upper)}${pick(lower)}${pick(digits)}!${rest}`;
}

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== "ESTATE_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.estateId) {
    return NextResponse.json({ error: "Missing estate" }, { status: 400 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = rateLimit({ key: `estate-admin:guards:create:${session.estateId}:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const identifier = parsed.data.identifier.trim();
  const isEmail = identifier.includes("@");
  const password = generatePassword();

  try {
    await cognitoAdminCreateUser({
      username: identifier,
      password,
      email: isEmail ? identifier : undefined,
      phoneNumber: !isEmail && identifier.startsWith("+") ? identifier : undefined,
      name,
      userAttributes: {
        "custom:role": "GUARD",
        "custom:estateId": session.estateId,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to create guard account" }, { status: 409 });
  }

  const sub = await cognitoAdminGetUserSub({ username: identifier });
  const now = new Date().toISOString();
  await putUser({
    userId: sub,
    estateId: session.estateId,
    role: "GUARD",
    name,
    email: isEmail ? identifier : undefined,
    phone: !isEmail ? identifier : undefined,
    createdAt: now,
    updatedAt: now,
  });

  await putActivityLog({
    estateId: session.estateId,
    type: "GUARD_CREATED",
    message: `${name} (${identifier})`,
  });

  return NextResponse.json({
    ok: true,
    credentials: { name, identifier, password },
  });
}
