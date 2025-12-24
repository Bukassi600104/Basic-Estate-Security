import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getEnv } from "@/lib/env";

let cachedDocClient: DynamoDBDocumentClient | null = null;

export function getDdbDocClient() {
  if (cachedDocClient) return cachedDocClient;

  const { AWS_REGION } = getEnv();
  const client = new DynamoDBClient({ region: AWS_REGION });
  cachedDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  return cachedDocClient;
}
