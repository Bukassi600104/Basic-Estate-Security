import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createEstate, deleteEstateById } from "@/lib/repos/estates";
import { putUser } from "@/lib/repos/users";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";

export const runtime = "nodejs";

const bodySchema = z.object({
  estateName: z.string().min(2),
  estateAddress: z.string().min(2),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]).default("BASIC"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

export async function POST(req: Request) {
  let createdEstateId: string | null = null;
  let createdUserId: string | null = null;

  try {
    try {
      enforceSameOriginForMutations(req);
    } catch {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }

    const h = headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
    const rl = await rateLimitHybrid({
      category: "LOGIN",
      key: `auth:sign-up:${ip}`,
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

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { estateName, estateAddress, adminName, email, password, tier, billingCycle } = parsed.data;

    // 1) Create estate record
    const estate = await createEstate({ name: estateName, address: estateAddress, tier, billingCycle });
    createdEstateId = estate.estateId;

    // 2) Create Supabase auth user via admin API
    const sbAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: adminName, role: "ESTATE_ADMIN", estate_id: estate.estateId },
    });

    if (authError) {
      await deleteEstateById(estate.estateId).catch(() => null);
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists", code: "ACCOUNT_EXISTS" },
          { status: 409 },
        );
      }
      throw authError;
    }

    createdUserId = authData.user.id;

    // 3) Create user profile in our users table
    const now = new Date().toISOString();
    await putUser({
      userId: authData.user.id,
      estateId: estate.estateId,
      role: "ESTATE_ADMIN",
      name: adminName,
      email,
      createdAt: now,
      updatedAt: now,
    });

    // 4) Sign in the user to set session cookies
    const supabase = createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return NextResponse.json({ error: "Account created but sign-in failed. Please sign in manually." }, { status: 201 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("sign_up_failed", (error as Error)?.message);

    if (createdUserId) {
      const sbAdmin = getSupabaseAdmin();
      await sbAdmin.auth.admin.deleteUser(createdUserId).catch(() => null);
    }
    if (createdEstateId) {
      await deleteEstateById(createdEstateId).catch(() => null);
    }

    return NextResponse.json({ error: "Unable to complete sign-up. Please try again." }, { status: 500 });
  }
}
