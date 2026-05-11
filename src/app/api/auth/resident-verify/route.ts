import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { findEstateByName } from "@/lib/repos/estates";
import { findResidentByPhoneInEstate } from "@/lib/repos/residents";
import { listUsersForResident, getUserById } from "@/lib/repos/users";
import { createSupabaseServerClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

const bodySchema = z.object({
  estateName: z.string().min(2),
  residentName: z.string().min(2),
  phone: z.string().min(6),
  verificationCode: z.string().min(8),
  password: z.string().min(1),
});

function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const partsA = na.split(" ");
  const partsB = nb.split(" ");
  if (partsA[0] === partsB[0]) return true;
  return false;
}

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

  const { estateName, residentName, phone, verificationCode, password } = parsed.data;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:resident-verify:${ip}:${phone}`,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.error },
      {
        status: rl.status,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...(rl.retryAfterSeconds ? { "Retry-After": String(rl.retryAfterSeconds) } : {}),
        },
      },
    );
  }

  // 1. Find estate
  const estate = await findEstateByName(estateName);
  if (!estate) return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  if (estate.status !== "ACTIVE") return NextResponse.json({ error: "Estate is not active" }, { status: 403 });

  // 2. Find resident by phone
  const resident = await findResidentByPhoneInEstate({ estateId: estate.estateId, phone });
  if (!resident) return NextResponse.json({ error: "Resident not found" }, { status: 404 });
  if (resident.status !== "APPROVED") {
    return NextResponse.json({ error: "Your account is not active. Please contact your estate admin." }, { status: 403 });
  }

  // 3. Validate verification code
  const providedCode = verificationCode.toUpperCase().trim();
  const storedCode = (resident.verificationCode || "").toUpperCase().trim();
  if (!storedCode || providedCode !== storedCode) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  // 4. Verify name
  if (!fuzzyNameMatch(resident.name, residentName)) {
    return NextResponse.json({ error: "Name does not match" }, { status: 401 });
  }

  // 5. Find user account
  const users = await listUsersForResident({
    estateId: estate.estateId,
    residentId: resident.residentId,
    limit: 10,
  });
  const residentUser = users.find((u) => u.role === "RESIDENT") || users[0];
  if (!residentUser) {
    return NextResponse.json({ error: "Account not found. Please contact your estate admin." }, { status: 404 });
  }

  // 6. Authenticate via Supabase
  const supabaseEmail = residentUser.email || `resident-${phone.replace(/[^0-9]/g, "")}@estate.local`;

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: supabaseEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // 7. Verify profile
  const profile = await getUserById(residentUser.userId);
  if (!profile) {
    return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
