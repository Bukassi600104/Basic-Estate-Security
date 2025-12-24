type Counter = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | { ok: true }
  | {
      ok: false;
      retryAfterSeconds: number;
      remainingSeconds: number;
    };

function getStore(): Map<string, Counter> {
  const g = globalThis as unknown as { __bs_rate_limit_store__?: Map<string, Counter> };
  if (!g.__bs_rate_limit_store__) g.__bs_rate_limit_store__ = new Map();
  return g.__bs_rate_limit_store__;
}

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const store = getStore();
  const now = Date.now();

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const remainingMs = Math.max(0, existing.resetAt - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, remainingSeconds),
      remainingSeconds,
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return { ok: true };
}
