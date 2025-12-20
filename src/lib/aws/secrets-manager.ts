import "server-only";

import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { z } from "zod";

const appSecretsSchema = z.object({
  AUTH_JWT_SECRET: z.string().min(20),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
});

export type AppSecrets = z.infer<typeof appSecretsSchema>;

type GetAppSecretsOptions = {
  secretId?: string;
  region?: string;
};

let cachedSecrets: AppSecrets | null = null;

export async function getAppSecretsFromSecretsManager(
  options: GetAppSecretsOptions = {},
): Promise<AppSecrets> {
  if (cachedSecrets) return cachedSecrets;

  const secretId = options.secretId ?? process.env.APP_SECRETS_NAME ?? "prod/app-secrets";
  const region = options.region ?? process.env.AWS_REGION ?? "eu-north-1";

  const client = new SecretsManagerClient({ region });
  const resp = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
    }),
  );

  if (!resp.SecretString) {
    throw new Error(
      `Secrets Manager secret '${secretId}' has no SecretString (region: ${region}).`,
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(resp.SecretString);
  } catch {
    throw new Error(
      `Secrets Manager secret '${secretId}' SecretString is not valid JSON (region: ${region}).`,
    );
  }

  const parsed = appSecretsSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error(
      `Secrets Manager secret '${secretId}' is missing required keys: AUTH_JWT_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.`,
    );
  }

  cachedSecrets = parsed.data;
  return cachedSecrets;
}
