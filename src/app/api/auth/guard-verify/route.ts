import { NextResponse } from "next/server";
import { z } from "zod";
import { headers, cookies } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { findEstateByName, getEstateById } from "@/lib/repos/estates";
import { findGuardByPhoneInEstate, getUserById } from "@/lib/repos/users";
import { getGateById } from "@/lib/repos/gates";
import { createShift, endAllActiveShiftsForGuard } from "@/lib/repos/guard-shifts";
import { createSupabaseServerClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

const SHIFT_COOKIE = "guard_shift_id";

const bodySchema = z.object({
  estateName: z.string().min(2),
  estateId: z.string().optional(),
  guardName: z.string().min(2),
  phone: z.string().min(6),
  verificationCode: z.string().min(8),
  password: z.string().min(1),
  gateId: z.string().min(1).optional(),
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

  const { estateName, estateId, guardName, phone, verificationCode, password, gateId: selectedGateId } = parsed.data;

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:guard-verify:${ip}:${phone}`,
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
  const estate = estateId ? await getEstateById(estateId) : await findEstateByName(estateName);
  if (!estate) return NextResponse.json({ error: "Estate not found" }, { status: 404 });
  if (estate.status !== "ACTIVE") return NextResponse.json({ error: "Estate is not active" }, { status: 403 });

  // 2. Find guard by phone
  const guard = await findGuardByPhoneInEstate({ estateId: estate.estateId, phone });
  if (!guard) return NextResponse.json({ error: "Guard not found" }, { status: 404 });

  // 3. Validate verification code
  const providedCode = verificationCode.toUpperCase().trim();
  const storedCode = (guard.verificationCode || "").toUpperCase().trim();
  if (!storedCode || providedCode !== storedCode) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  // 4. Verify name
  if (!fuzzyNameMatch(guard.name, guardName)) {
    return NextResponse.json({ error: "Name does not match" }, { status: 401 });
  }

  // 5. Authenticate via Supabase
  const guardEmail = guard.authEmail || guard.email || `guard-${phone.replace(/[^0-9]/g, "")}@estate.local`;

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: guardEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // 6. Verify profile
  const profile = await getUserById(guard.userId);
  if (!profile) {
    return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
  }

  if (selectedGateId) {
    const gate = await getGateById(selectedGateId);
    if (!gate || gate.estateId !== estate.estateId) {
      return NextResponse.json({ error: "Invalid gate selection" }, { status: 400 });
    }

    await endAllActiveShiftsForGuard(profile.userId);
    const shiftType = gate.shiftType ?? "DAY";
    const shift = await createShift({
      estateId: estate.estateId,
      guardUserId: profile.userId,
      guardName: guard.name,
      gateId: gate.gateId,
      gateName: gate.name,
      shiftType,
    });

    const cookieStore = cookies();
    cookieStore.set(SHIFT_COOKIE, shift.shiftId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return NextResponse.json({
      ok: true,
      shift: { shiftId: shift.shiftId, gateName: gate.name, shiftType },
    });
  }

  return NextResponse.json({
    ok: true,
  });
}
