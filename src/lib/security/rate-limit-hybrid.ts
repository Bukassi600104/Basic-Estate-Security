import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit as rateLimitMemory } from "@/lib/security/rate-limit";

export type RateLimitCategory = "LOGIN" | "OPS";

type HybridRateLimitResult =
  | { ok: true; source: "pg" | "memory" }
  | {
      ok: false;
      status: 429 | 503;
      error: string;
      retryAfterSeconds?: number;
      remainingSeconds?: number;
      source: "pg" | "memory" | "blocked";
    };

function getWindowStartMs(nowMs: number, windowMs: number) {
  return Math.floor(nowMs / windowMs) * windowMs;
}

function getRemainingSeconds(nowMs: number, windowStartMs: number, windowMs: number) {
  const windowEndMs = windowStartMs + windowMs;
  const remainingMs = Math.max(0, windowEndMs - nowMs);
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

export async function rateLimitHybrid(params: {
  category: RateLimitCategory;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<HybridRateLimitResult> {
  const nowMs = Date.now();
  const windowStartMs = getWindowStartMs(nowMs, params.windowMs);
  const rateLimitKey = `rl:${params.key}:w${windowStartMs}`;
  const expiresAt = new Date(windowStartMs + params.windowMs + 60_000).toISOString();

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("increment_rate_limit", {
      p_key: rateLimitKey,
      p_expires_at: expiresAt,
    });

    if (error) {
      throw error;
    }

    const rows = data as unknown;
    const newCount =
      typeof rows === "number"
        ? rows
        : Array.isArray(rows)
          ? ((rows[0]?.count as number | undefined) ?? 1)
          : 1;
    if (newCount > params.limit) {
      const remainingSeconds = getRemainingSeconds(nowMs, windowStartMs, params.windowMs);
      return { ok: false, status: 429, error: "Too many attempts", retryAfterSeconds: remainingSeconds, remainingSeconds, source: "pg" };
    }

    return { ok: true, source: "pg" };
  } catch (err) {
    console.error("rate_limit_pg_error", JSON.stringify({
      key: params.key,
      category: params.category,
      error: (err as Error)?.message ?? "Unknown",
    }));

    const rl = rateLimitMemory({ key: `mem:${params.key}`, limit: params.limit, windowMs: params.windowMs });
    if (!rl.ok) {
      return {
        ok: false,
        status: 429,
        error: "Too many attempts. Please wait a moment and try again.",
        retryAfterSeconds: rl.retryAfterSeconds,
        remainingSeconds: rl.remainingSeconds,
        source: "memory",
      };
    }

    return { ok: true, source: "memory" };
  }
}
