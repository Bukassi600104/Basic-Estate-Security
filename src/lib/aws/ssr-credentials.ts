/**
 * Returns explicit AWS credentials for Amplify SSR runtime.
 *
 * AWS Amplify's WEB_COMPUTE platform doesn't automatically inject IAM role
 * credentials into the SSR runtime. This helper reads credentials from
 * custom environment variables set in Amplify.
 *
 * Returns undefined if no SSR credentials are configured, allowing the SDK
 * to fall back to the default credential chain (works locally with SSO).
 */
export function getSsrCredentials():
  | { accessKeyId: string; secretAccessKey: string }
  | undefined {
  const accessKeyId = process.env.SSR_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SSR_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }

  return undefined;
}
