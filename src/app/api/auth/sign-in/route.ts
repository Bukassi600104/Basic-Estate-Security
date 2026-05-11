import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getUserById } from "@/lib/repos/users";
import { rateLimitHybrid } from "@/lib/security/rate-limit-hybrid";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
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
  const rl = await rateLimitHybrid({
    category: "LOGIN",
    key: `auth:sign-in:${ip}:${identifier.toLowerCase()}`,
    limit: 10,
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

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (error) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const profile = await getUserById(data.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Account not provisioned" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("sign_in_failed", (error as Error)?.message);
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
}
