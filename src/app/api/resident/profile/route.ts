import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/repos/users";

export const runtime = "nodejs";

/**
 * GET /api/resident/profile
 * Returns user profile info including passwordChanged flag for first-login detection.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only allow RESIDENT and RESIDENT_DELEGATE roles
  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      userId: user.userId,
      name: user.name,
      role: user.role,
      passwordChanged: user.passwordChanged ?? false,
    },
  });
}
