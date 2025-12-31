/**
 * Creates the Super Admin user in AWS Cognito.
 *
 * Usage:
 *   node scripts/create-super-admin.mjs
 *
 * This script creates a Super Admin user with:
 *   - Username: Basic
 *   - Password: $Arianna600104#
 *   - Role: SUPER_ADMIN
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
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

// Load env files
const repoRoot = process.cwd();
loadDotEnvFile(path.join(repoRoot, ".env"));
loadDotEnvFile(path.join(repoRoot, ".env.local"));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// Super Admin credentials
const SUPER_ADMIN_USERNAME = "Basic";
const SUPER_ADMIN_PASSWORD = "$Arianna600104#";

const awsRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
if (!awsRegion) {
  console.error("Missing AWS_REGION (or AWS_DEFAULT_REGION) in env.");
  process.exit(2);
}

const cognitoRegion = process.env.COGNITO_USER_POOL_REGION ?? awsRegion;
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const usersTable = requireEnv("DDB_TABLE_USERS");

const cognito = new CognitoIdentityProviderClient({ region: cognitoRegion });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function main() {
  console.log("Creating Super Admin user...");
  console.log(`Username: ${SUPER_ADMIN_USERNAME}`);
  console.log(`User Pool: ${userPoolId}`);
  console.log("");

  let cognitoSub;
  let userExists = false;

  // Check if user already exists
  try {
    const existingUser = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: SUPER_ADMIN_USERNAME,
      })
    );
    console.log("User already exists in Cognito.");
    cognitoSub = existingUser.UserAttributes?.find(a => a.Name === "sub")?.Value;
    userExists = true;
  } catch (e) {
    if (e.name !== "UserNotFoundException") {
      throw e;
    }
  }

  if (!userExists) {
    // Create user in Cognito
    try {
      const createResult = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: SUPER_ADMIN_USERNAME,
          TemporaryPassword: SUPER_ADMIN_PASSWORD,
          UserAttributes: [
            { Name: "custom:role", Value: "SUPER_ADMIN" },
          ],
          MessageAction: "SUPPRESS", // Don't send welcome email
        })
      );
      console.log("User created in Cognito.");
      cognitoSub = createResult.User?.Attributes?.find(a => a.Name === "sub")?.Value;
    } catch (e) {
      if (e.name === "UsernameExistsException") {
        console.log("User already exists (caught on create).");
        const existingUser = await cognito.send(
          new AdminGetUserCommand({
            UserPoolId: userPoolId,
            Username: SUPER_ADMIN_USERNAME,
          })
        );
        cognitoSub = existingUser.UserAttributes?.find(a => a.Name === "sub")?.Value;
      } else {
        throw e;
      }
    }
  }

  // Set permanent password
  try {
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: SUPER_ADMIN_USERNAME,
        Password: SUPER_ADMIN_PASSWORD,
        Permanent: true,
      })
    );
    console.log("Password set to permanent.");
  } catch (e) {
    console.error("Failed to set password:", e.message);
    throw e;
  }

  // Create DynamoDB record
  if (cognitoSub) {
    const now = new Date().toISOString();
    try {
      await ddb.send(
        new PutCommand({
          TableName: usersTable,
          Item: {
            userId: cognitoSub,
            role: "SUPER_ADMIN",
            name: "Super Admin",
            email: SUPER_ADMIN_USERNAME,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
      console.log("DynamoDB user record created/updated.");
    } catch (e) {
      console.error("Failed to create DynamoDB record:", e.message);
      throw e;
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log("Super Admin user created successfully!");
  console.log("=".repeat(50));
  console.log("");
  console.log("Login credentials:");
  console.log(`  Username: ${SUPER_ADMIN_USERNAME}`);
  console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log("");
  console.log("You can now sign in at /auth/sign-in");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
