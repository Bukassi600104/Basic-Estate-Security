import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";
import type { PassType } from "@/lib/repos/codes";

export type DdbCursor = Record<string, unknown>;

export type ValidationOutcome = "SUCCESS" | "FAILURE";
export type ValidationDecision = "ALLOW" | "DENY";

export type ValidationLogRecord = {
  logId: string;
  estateId: string;
  validatedAt: string;

  gateId: string;
  gateName: string;

  outcome: ValidationOutcome;
  decision: ValidationDecision;
  failureReason?: string;

  passType?: PassType;
  residentName?: string;
  houseNumber?: string;
  codeValue: string;

  guardUserId: string;
  guardName?: string;
  guardPhone?: string;
};

export function newValidationLogId() {
  return `vlog_${nanoid(12)}`;
}

export async function putValidationLog(log: ValidationLogRecord) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  await ddb.send(
    new PutCommand({
      TableName: env.DDB_TABLE_VALIDATION_LOGS,
      Item: log,
      ConditionExpression: "attribute_not_exists(logId)",
    }),
  );
}

export async function listValidationLogsForEstatePage(params: {
  estateId: string;
  limit?: number;
  cursor?: DdbCursor;
}) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  const limit = params.limit ?? 200;

  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_VALIDATION_LOGS,
      IndexName: "GSI1",
      KeyConditionExpression: "estateId = :e",
      ExpressionAttributeValues: { ":e": params.estateId },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: (params.cursor as any) ?? undefined,
    }),
  );

  return {
    items: ((res.Items as ValidationLogRecord[] | undefined) ?? []).slice(0, limit),
    nextCursor: (res.LastEvaluatedKey as DdbCursor | undefined) ?? undefined,
  };
}

export async function listValidationLogsForEstate(params: { estateId: string; limit?: number }) {
  const page = await listValidationLogsForEstatePage({ estateId: params.estateId, limit: params.limit });
  return page.items;
}
