import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(20),
  TELEGRAM_BOT_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  TELEGRAM_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  SUPER_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  SUPER_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
  SUPER_ADMIN_NAME: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

function isNextBuildPhase() {
  const phase = process.env.NEXT_PHASE;
  return typeof phase === "string" && phase.includes("build");
}

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const candidate = {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME,
  };

  const parsed = envSchema.safeParse(candidate);
  if (parsed.success) {
    cachedEnv = parsed.data;
    return cachedEnv;
  }

  if (isNextBuildPhase()) {
    cachedEnv = envSchema.parse({
      ...candidate,
      DATABASE_URL: candidate.DATABASE_URL ?? "mysql://build:build@localhost:3306/build",
      AUTH_JWT_SECRET:
        candidate.AUTH_JWT_SECRET ?? "build_only_dummy_secret_build_only_dummy",
    });
    return cachedEnv;
  }

  throw parsed.error;
}
