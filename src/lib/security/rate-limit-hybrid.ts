import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";
import { rateLimit as rateLimitMemory } from "@/lib/security/rate-limit";

export type RateLimitCategory = "LOGIN" | "OPS";

type HybridRateLimitResult =
  | { ok: true; source: "ddb" | "memory" }
  | {
      ok: false;
      status: 429 | 503;
      error: string;
      retryAfterSeconds?: number;
      remainingSeconds?: number;
      source: "ddb" | "memory" | "blocked";
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

  // We store each window as a separate counter item. That makes retry-after
  // computation deterministic without an extra read.
  const rateLimitKey = `rl:${params.key}:w${windowStartMs}`;

  try {
    const env = getEnv();
    const ddb = getDdbDocClient();

    const ttlEpochSeconds = Math.ceil((windowStartMs + params.windowMs) / 1000) + 60;

    const res = await ddb.send(
      new UpdateCommand({
        TableName: env.DDB_TABLE_RATE_LIMITS,
        Key: { rateLimitKey },
        UpdateExpression: "ADD #count :inc SET ttlEpochSeconds = :ttl",
        ExpressionAttributeNames: {
          "#count": "count",
        },
        ExpressionAttributeValues: {
          ":inc": 1,
          ":ttl": ttlEpochSeconds,
        },
        ReturnValues: "UPDATED_NEW",
      }),
    );

    const newCount = (res.Attributes?.count as number | undefined) ?? 1;
    if (newCount > params.limit) {
      const remainingSeconds = getRemainingSeconds(nowMs, windowStartMs, params.windowMs);
      return {
        ok: false,
        status: 429,
        error: "Too many attempts",
        retryAfterSeconds: remainingSeconds,
        remainingSeconds,
        source: "ddb",
      };
    }

    return { ok: true, source: "ddb" };
  } catch (err) {
    // Log the actual error for debugging
    const e = err as Error & { name?: string; code?: string; $metadata?: { httpStatusCode?: number } };
    console.error("rate_limit_ddb_error", JSON.stringify({
      key: params.key,
      category: params.category,
      errorName: e?.name ?? "Unknown",
      errorMessage: e?.message ?? "Unknown error",
      errorCode: e?.code ?? null,
      httpStatusCode: e?.$metadata?.httpStatusCode ?? null,
    }));

    // Fail-safe policy:
    // - LOGIN: fail-closed (block) if durable limiter fails.
    // - OPS: fail-open (do not hard-block), but keep in-memory throttling.
    if (params.category === "LOGIN") {
      return {
        ok: false,
        status: 503,
        error: "Temporarily unavailable",
        source: "blocked",
      };
    }

    const rl = rateLimitMemory({ key: `mem:${params.key}`, limit: params.limit, windowMs: params.windowMs });
    if (!rl.ok) {
      return {
        ok: false,
        status: 429,
        error: "Too many attempts",
        retryAfterSeconds: rl.retryAfterSeconds,
        remainingSeconds: rl.remainingSeconds,
        source: "memory",
      };
    }

    return { ok: true, source: "memory" };
  }
}
