import {
  CognitoIdentityProviderClient,
  type InitiateAuthCommandInput,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  type RespondToAuthChallengeCommandInput,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  SetUserMFAPreferenceCommand,
  GetUserCommand,
  UpdateUserAttributesCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { getEnv } from "@/lib/env";
import { getSsrCredentials } from "./ssr-credentials";

let cachedClient: CognitoIdentityProviderClient | null = null;

export function getCognitoClient() {
  if (cachedClient) return cachedClient;
  const env = getEnv();
  const credentials = getSsrCredentials();

  cachedClient = new CognitoIdentityProviderClient({
    region: env.COGNITO_USER_POOL_REGION ?? env.AWS_REGION,
    ...(credentials ? { credentials } : {}),
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

  if (res.ChallengeName && res.Session) {
    return {
      kind: "CHALLENGE" as const,
      challengeName: res.ChallengeName,
      session: res.Session,
    };
  }

  const auth = res.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken || !auth.RefreshToken) {
    throw new Error("Missing Cognito tokens");
  }

  return {
    kind: "TOKENS" as const,
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
    expiresIn: auth.ExpiresIn,
    tokenType: auth.TokenType,
  };
}

export async function cognitoRespondToSoftwareTokenMfa(params: {
  username: string;
  session: string;
  code: string;
}) {
  const env = getEnv();
  const client = getCognitoClient();

  const input: RespondToAuthChallengeCommandInput = {
    ClientId: env.COGNITO_CLIENT_ID,
    ChallengeName: "SOFTWARE_TOKEN_MFA",
    Session: params.session,
    ChallengeResponses: {
      USERNAME: params.username,
      SOFTWARE_TOKEN_MFA_CODE: params.code,
    },
  };

  const res = await client.send(new RespondToAuthChallengeCommand(input));
  const auth = res.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken || !auth.RefreshToken) {
    throw new Error("Missing Cognito tokens");
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
    expiresIn: auth.ExpiresIn,
    tokenType: auth.TokenType,
  };
}

export async function cognitoRefreshSession(params: { refreshToken: string }) {
  const env = getEnv();
  const client = getCognitoClient();

  const input: InitiateAuthCommandInput = {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: env.COGNITO_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: params.refreshToken,
    },
  };

  const res = await client.send(new InitiateAuthCommand(input));
  const auth = res.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken) {
    throw new Error("Missing refreshed tokens");
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    expiresIn: auth.ExpiresIn,
    tokenType: auth.TokenType,
  };
}

export async function cognitoStartTotpEnrollment(params: { accessToken: string }) {
  const client = getCognitoClient();

  const res = await client.send(
    new AssociateSoftwareTokenCommand({
      AccessToken: params.accessToken,
    }),
  );

  if (!res.SecretCode || !res.Session) {
    throw new Error("Missing TOTP enrollment data");
  }

  return {
    secretCode: res.SecretCode,
    session: res.Session,
  };
}

export async function cognitoVerifyTotpEnrollment(params: {
  accessToken: string;
  session: string;
  code: string;
}) {
  const client = getCognitoClient();
  const res = await client.send(
    new VerifySoftwareTokenCommand({
      AccessToken: params.accessToken,
      Session: params.session,
      UserCode: params.code,
    }),
  );

  if (res.Status !== "SUCCESS") {
    throw new Error("Invalid code");
  }

  await client.send(
    new SetUserMFAPreferenceCommand({
      AccessToken: params.accessToken,
      SoftwareTokenMfaSettings: {
        Enabled: true,
        PreferredMfa: true,
      },
    }),
  );

  // Mark MFA as enabled for app-layer enforcement.
  await client.send(
    new UpdateUserAttributesCommand({
      AccessToken: params.accessToken,
      UserAttributes: [{ Name: "custom:mfaEnabled", Value: "true" }],
    }),
  );

  // Return a small amount of identity info for UI labels if needed.
  const user = await client.send(new GetUserCommand({ AccessToken: params.accessToken }));
  return {
    username: user.Username,
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

export async function cognitoAdminDeleteUser(params: { username: string }) {
  const env = getEnv();
  const client = getCognitoClient();

  await client.send(
    new AdminDeleteUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: params.username,
    }),
  );
}
