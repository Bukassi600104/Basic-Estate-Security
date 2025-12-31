import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";
import { getSession, getAccessToken } from "@/lib/auth/session";
import { cognitoChangePassword } from "@/lib/aws/cognito";
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

  // Only allow RESIDENT and RESIDENT_DELEGATE roles
  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  // Rate limit
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
      }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || "Invalid input";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  // Validate new password has mix of characters
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return NextResponse.json(
      { error: "Password must contain uppercase, lowercase, number, and special character (!@#$%^&*)" },
      { status: 400 }
    );
  }

  try {
    await cognitoChangePassword({
      accessToken,
      previousPassword: currentPassword,
      proposedPassword: newPassword,
    });

    // Mark that user has changed their password (for first-login tracking)
    try {
      await markPasswordChanged(session.userId);
    } catch (e) {
      // Non-critical - log but don't fail the request
      console.error("mark_password_changed_error", JSON.stringify({
        userId: session.userId,
        error: (e as Error)?.message ?? "",
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const e = error as any;
    const name = typeof e?.name === "string" ? e.name : "UnknownError";

    if (name === "NotAuthorizedException") {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    if (name === "LimitExceededException") {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
    if (name === "InvalidPasswordException") {
      return NextResponse.json({ error: "New password does not meet requirements" }, { status: 400 });
    }

    console.error("change_password_error", JSON.stringify({
      name,
      message: e?.message ?? "",
      userId: session.userId,
    }));

    return NextResponse.json(
      { error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}
