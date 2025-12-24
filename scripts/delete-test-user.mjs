import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
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

// Ensure running this script has the same env that `next dev` would.
const repoRoot = process.cwd();
loadDotEnvFile(path.join(repoRoot, ".env"));
loadDotEnvFile(path.join(repoRoot, ".env.local"));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function isProductionLike() {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  return nodeEnv === "production";
}

const username = process.argv[2] ?? process.env.DELETE_USERNAME;
if (!username) {
  console.error("Usage: node scripts/delete-test-user.mjs <cognito-username>");
  console.error("Example: CONFIRM_DEV_DELETE=YES node scripts/delete-test-user.mjs user@example.com");
  process.exit(2);
}

if (isProductionLike()) {
  console.error("Refusing to delete users when NODE_ENV=production.");
  process.exit(2);
}

if (process.env.CONFIRM_DEV_DELETE !== "YES") {
  console.error("Refusing to run without CONFIRM_DEV_DELETE=YES");
  process.exit(2);
}

const awsRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
if (!awsRegion) {
  console.error("Missing AWS_REGION (or AWS_DEFAULT_REGION) in env.");
  process.exit(2);
}

const cognitoRegion = process.env.COGNITO_USER_POOL_REGION ?? awsRegion;
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const usersTable = requireEnv("DDB_TABLE_USERS");

const cognito = new CognitoIdentityProviderClient({ region: cognitoRegion });

let cognitoDeleted = false;
try {
  await cognito.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    }),
  );
  cognitoDeleted = true;
} catch (e) {
  const name = e && typeof e === "object" ? e.name : "";
  if (name === "UserNotFoundException") {
    // ok
  } else {
    throw e;
  }
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }), {
  marshallOptions: { removeUndefinedValues: true },
});

let deletedUserRows = 0;
let lastKey = undefined;

// Best-effort cleanup: find any UserRecord rows with matching email or phone.
// Table PK is userId (Cognito sub), so this uses Scan.
while (true) {
  const res = await ddb.send(
    new ScanCommand({
      TableName: usersTable,
      ProjectionExpression: "userId, email, phone",
      FilterExpression: "#email = :u OR #phone = :u",
      ExpressionAttributeNames: {
        "#email": "email",
        "#phone": "phone",
      },
      ExpressionAttributeValues: {
        ":u": username,
      },
      ExclusiveStartKey: lastKey,
    }),
  );

  for (const item of res.Items ?? []) {
    if (!item || typeof item !== "object") continue;
    const userId = item.userId;
    if (typeof userId !== "string" || userId.length === 0) continue;

    await ddb.send(
      new DeleteCommand({
        TableName: usersTable,
        Key: { userId },
      }),
    );
    deletedUserRows += 1;
  }

  lastKey = res.LastEvaluatedKey;
  if (!lastKey) break;
}

console.log(JSON.stringify({
  ok: true,
  username,
  cognito: cognitoDeleted ? "deleted" : "not_found",
  dynamodbUsersDeleted: deletedUserRows,
}));
