/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Amplify SSR (Web Compute) can sometimes fail to expose branch env vars at runtime.
  // These values are NOT secrets; baking them at build-time keeps server routes working.
  // Do not add credentials/secrets here.
  env: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,

    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    COGNITO_USER_POOL_REGION: process.env.COGNITO_USER_POOL_REGION,

    DDB_TABLE_ESTATES: process.env.DDB_TABLE_ESTATES,
    DDB_TABLE_USERS: process.env.DDB_TABLE_USERS,
    DDB_TABLE_RESIDENTS: process.env.DDB_TABLE_RESIDENTS,
    DDB_TABLE_CODES: process.env.DDB_TABLE_CODES,
    DDB_TABLE_GATES: process.env.DDB_TABLE_GATES,
    DDB_TABLE_VALIDATION_LOGS: process.env.DDB_TABLE_VALIDATION_LOGS,
    DDB_TABLE_ACTIVITY_LOGS: process.env.DDB_TABLE_ACTIVITY_LOGS,
    DDB_TABLE_PWA_INVITES: process.env.DDB_TABLE_PWA_INVITES,
    DDB_TABLE_UNIQ: process.env.DDB_TABLE_UNIQ,
    DDB_TABLE_RATE_LIMITS: process.env.DDB_TABLE_RATE_LIMITS,
  },
};

export default nextConfig;
