import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import fs from "node:fs";
import path from "node:path";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function isProductionLike() {
  const nodeEnv = String(process.env.NODE_ENV ?? "").toLowerCase();
  return nodeEnv === "production";
}

function requireConfirm() {
  const confirm = process.env.CONFIRM_CLEAR_ALL;
  const confirm2 = process.env.CONFIRM_CLEAR_ALL_2;

  if (confirm !== "YES" || confirm2 !== "DELETE_EVERYTHING") {
    console.error("Refusing to run without explicit confirmation.");
    console.error("Set: CONFIRM_CLEAR_ALL=YES");
    console.error("And: CONFIRM_CLEAR_ALL_2=DELETE_EVERYTHING");
    process.exit(2);
  }

  if (isProductionLike() && process.env.CONFIRM_PROD_CLEAR !== "YES") {
    console.error("Refusing to delete in NODE_ENV=production without CONFIRM_PROD_CLEAR=YES");
    process.exit(2);
  }
}

async function deleteAllCognitoUsers({ cognito, userPoolId }) {
  let deleted = 0;
  let paginationToken = undefined;

  while (true) {
    const res = await cognito.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        PaginationToken: paginationToken,
        Limit: 60,
      }),
    );

    for (const user of res.Users ?? []) {
      if (!user?.Username) continue;
      await cognito.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: user.Username,
        }),
      );
      deleted += 1;
    }

    paginationToken = res.PaginationToken;
    if (!paginationToken) break;
  }

  return deleted;
}

async function clearTable({ ddb, tableName, keyName }) {
  let deleted = 0;
  let lastKey = undefined;

  while (true) {
    const res = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "#pk",
        ExpressionAttributeNames: { "#pk": keyName },
        ExclusiveStartKey: lastKey,
      }),
    );

    const keys = (res.Items ?? [])
      .map((item) => item?.[keyName])
      .filter((value) => typeof value === "string" && value.length > 0);

    for (let i = 0; i < keys.length; i += 25) {
      const chunk = keys.slice(i, i + 25);
      if (chunk.length === 0) continue;

      const requestItems = {
        [tableName]: chunk.map((pkValue) => ({
          DeleteRequest: {
            Key: { [keyName]: pkValue },
          },
        })),
      };

      const writeRes = await ddb.send(new BatchWriteCommand({ RequestItems: requestItems }));
      const unprocessed = writeRes.UnprocessedItems?.[tableName]?.length ?? 0;
      if (unprocessed > 0) {
        throw new Error(
          `UnprocessedItems returned while deleting from ${tableName}. Try again (or add retries).`,
        );
      }

      deleted += chunk.length;
    }

    lastKey = res.LastEvaluatedKey;
    if (!lastKey) break;
  }

  return deleted;
}

// Ensure running this script has the same env that `next dev` would.
const repoRoot = process.cwd();
loadDotEnvFile(path.join(repoRoot, ".env"));
loadDotEnvFile(path.join(repoRoot, ".env.local"));

requireConfirm();

const awsRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
if (!awsRegion) {
  console.error("Missing AWS_REGION (or AWS_DEFAULT_REGION) in env.");
  process.exit(2);
}

const cognitoRegion = process.env.COGNITO_USER_POOL_REGION ?? awsRegion;
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");

const tables = [
  { env: "DDB_TABLE_ESTATES", key: "estateId" },
  { env: "DDB_TABLE_USERS", key: "userId" },
  { env: "DDB_TABLE_RESIDENTS", key: "residentId" },
  { env: "DDB_TABLE_CODES", key: "codeKey" },
  { env: "DDB_TABLE_GATES", key: "gateId" },
  { env: "DDB_TABLE_VALIDATION_LOGS", key: "logId" },
  { env: "DDB_TABLE_ACTIVITY_LOGS", key: "activityId" },
  { env: "DDB_TABLE_PWA_INVITES", key: "inviteId" },
  { env: "DDB_TABLE_UNIQ", key: "uniqKey" },
];

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }), {
  marshallOptions: { removeUndefinedValues: true },
});

const cognito = new CognitoIdentityProviderClient({ region: cognitoRegion });

const cognitoDeleted = await deleteAllCognitoUsers({ cognito, userPoolId });

const ddbDeleted = {};
for (const table of tables) {
  const tableName = requireEnv(table.env);
  ddbDeleted[table.env] = await clearTable({ ddb, tableName, keyName: table.key });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      awsRegion,
      cognitoRegion,
      cognitoUsersDeleted: cognitoDeleted,
      dynamodbDeleted: ddbDeleted,
    },
    null,
    2,
  ),
);
