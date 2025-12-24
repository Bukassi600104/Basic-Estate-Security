import {
  CognitoIdentityProviderClient,
  type InitiateAuthCommandInput,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getEnv } from "@/lib/env";

let cachedClient: CognitoIdentityProviderClient | null = null;

export function getCognitoClient() {
  if (cachedClient) return cachedClient;
  const env = getEnv();
  cachedClient = new CognitoIdentityProviderClient({
    region: env.COGNITO_USER_POOL_REGION ?? env.AWS_REGION,
  });
  return cachedClient;
}

export async function cognitoPasswordSignIn(params: {
  username: string;
  password: string;
}) {
  const env = getEnv();
  const client = getCognitoClient();

  const input: InitiateAuthCommandInput = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: params.username,
      PASSWORD: params.password,
    },
  };

  const res = await client.send(new InitiateAuthCommand(input));
  const auth = res.AuthenticationResult;
  if (!auth?.IdToken) throw new Error("Missing Cognito IdToken");

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
    expiresIn: auth.ExpiresIn,
    tokenType: auth.TokenType,
  };
}

export async function cognitoAdminCreateUser(params: {
  username: string;
  password: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
  userAttributes?: Record<string, string | undefined>;
}) {
  const env = getEnv();
  const client = getCognitoClient();

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: params.username,
      MessageAction: "SUPPRESS",
      UserAttributes: Object.entries({
        email: params.email,
        name: params.name,
        phone_number: params.phoneNumber,
        ...(params.userAttributes ?? {}),
      })
        .filter(([, v]) => typeof v === "string" && v.length > 0)
        .map(([Name, Value]) => ({ Name, Value: String(Value) })),
    }),
  );

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: params.username,
      Password: params.password,
      Permanent: true,
    }),
  );
}

export async function cognitoAdminGetUserSub(params: { username: string }) {
  const env = getEnv();
  const client = getCognitoClient();

  const res = await client.send(
    new AdminGetUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: params.username,
    }),
  );

  const attrs = res.UserAttributes ?? [];
  const sub = attrs.find((a) => a.Name === "sub")?.Value;
  if (!sub) throw new Error("Missing Cognito sub");
  return sub;
}
