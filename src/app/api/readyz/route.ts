import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { getEnv } from "@/lib/env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const env = getEnv();
    const client = new DynamoDBClient({ region: env.AWS_REGION });

    const tables = [
      env.DDB_TABLE_ESTATES,
      env.DDB_TABLE_USERS,
      env.DDB_TABLE_RESIDENTS,
      env.DDB_TABLE_CODES,
      env.DDB_TABLE_GATES,
      env.DDB_TABLE_VALIDATION_LOGS,
      env.DDB_TABLE_ACTIVITY_LOGS,
      env.DDB_TABLE_PWA_INVITES,
      env.DDB_TABLE_UNIQ,
      env.DDB_TABLE_RATE_LIMITS,
    ];

    await Promise.all(
      tables.map((tableName) => client.send(new DescribeTableCommand({ TableName: tableName }))),
    );

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("/api/readyz failed", error);
    return NextResponse.json(
      { error: "Not ready" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
