import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { getSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { markPasswordChanged } from "@/lib/repos/users";

export const runtime = "nodejs";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(5).max(8),
});

export async function POST(req: Request) {
  try {
    enforceSameOriginForMutations(req);
  } catch {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const h = headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "unknown";
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `resident:change-password:${ip}:${session.userId}`,
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
    const firstError = parsed.error.errors[0]?.message || "Invalid input";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return NextResponse.json(
      { error: "Password must contain uppercase, lowercase, number, and special character (!@#$%^&*)" },
      { status: 400 },
    );
  }

  try {
    // Verify current password by re-authenticating
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    // Try signing in with current password to verify it
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return NextResponse.json({ error: "Failed to change password. Please try again." }, { status: 500 });
    }

    try {
      await markPasswordChanged(session.userId);
    } catch (e) {
      console.error("mark_password_changed_error", (e as Error)?.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("change_password_error", (error as Error)?.message);
    return NextResponse.json({ error: "Failed to change password. Please try again." }, { status: 500 });
  }
}
