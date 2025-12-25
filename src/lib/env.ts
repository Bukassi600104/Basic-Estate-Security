import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  AWS_REGION: z.string().min(1),

  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),

  DDB_TABLE_ESTATES: z.string().min(1),
  DDB_TABLE_USERS: z.string().min(1),
  DDB_TABLE_RESIDENTS: z.string().min(1),
  DDB_TABLE_CODES: z.string().min(1),
  DDB_TABLE_GATES: z.string().min(1),
  DDB_TABLE_VALIDATION_LOGS: z.string().min(1),
  DDB_TABLE_ACTIVITY_LOGS: z.string().min(1),
  DDB_TABLE_PWA_INVITES: z.string().min(1),
  DDB_TABLE_UNIQ: z.string().min(1),

  // Optional for local/dev; if set, will be used for Cognito admin APIs.
  COGNITO_USER_POOL_REGION: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const candidate = {
    AWS_REGION: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,

    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,

    DDB_TABLE_ESTATES: process.env.DDB_TABLE_ESTATES,
    DDB_TABLE_USERS: process.env.DDB_TABLE_USERS,
    DDB_TABLE_RESIDENTS: process.env.DDB_TABLE_RESIDENTS,
    DDB_TABLE_CODES: process.env.DDB_TABLE_CODES,
    DDB_TABLE_GATES: process.env.DDB_TABLE_GATES,
    DDB_TABLE_VALIDATION_LOGS: process.env.DDB_TABLE_VALIDATION_LOGS,
    DDB_TABLE_ACTIVITY_LOGS: process.env.DDB_TABLE_ACTIVITY_LOGS,
    DDB_TABLE_PWA_INVITES: process.env.DDB_TABLE_PWA_INVITES,
    DDB_TABLE_UNIQ: process.env.DDB_TABLE_UNIQ,

    COGNITO_USER_POOL_REGION: process.env.COGNITO_USER_POOL_REGION,
  };

  const parsed = envSchema.safeParse(candidate);
  if (parsed.success) {
    cachedEnv = parsed.data;
    return cachedEnv;
  }

  throw parsed.error;
}
