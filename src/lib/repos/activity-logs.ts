import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type DdbCursor = Record<string, unknown>;

export type ActivityLogRecord = {
  activityId: string;
  estateId: string;
  type: string;
  message: string;
  createdAt: string;
};

export function newActivityId() {
  return `alog_${nanoid(12)}`;
}

export async function putActivityLog(params: {
  estateId: string;
  type: string;
  message: string;
  createdAtIso?: string;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const createdAt = params.createdAtIso ?? new Date().toISOString();

  const item: ActivityLogRecord = {
    activityId: newActivityId(),
    estateId: params.estateId,
    type: params.type,
    message: params.message,
    createdAt,
  };

  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_ACTIVITY_LOGS,
      Item: item,
      ConditionExpression: "attribute_not_exists(activityId)",
    }),
  );

  return item;
}

export async function listActivityLogsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: DdbCursor;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 100;

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_ACTIVITY_LOGS,
      IndexName: "GSI1",
      KeyConditionExpression: "estateId = :e",
      ExpressionAttributeValues: { ":e": params.estateId },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: (params.cursor as any) ?? undefined,
    }),
  );

  return {
    items: ((res.Items as ActivityLogRecord[] | undefined) ?? []).slice(0, limit),
    nextCursor: (res.LastEvaluatedKey as DdbCursor | undefined) ?? undefined,
  };
}

export async function listActivityLogsForEstate(params: { estateId: string; limit?: number }) {
  const page = await listActivityLogsForEstatePage({ estateId: params.estateId, limit: params.limit });
  return page.items;
}
