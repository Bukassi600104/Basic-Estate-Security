import crypto from "crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { getDdbDocClient } from "@/lib/aws/dynamo";
import { getEnv } from "@/lib/env";

export type PwaInviteType = "RESIDENT" | "SECURITY";

export type PwaInviteRecord = {
  inviteId: string;
  tokenHash: string;
  estateId: string;
  type: PwaInviteType;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;

  // GSI helpers
  estateTypeKey: string; // `ESTATE#{estateId}#TYPE#{type}`
};

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256Base64Url(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("base64url");
}

export async function getInviteById(inviteId: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();
  const res = await ddb.send(
    new GetCommand({
      TableName: env.DDB_TABLE_PWA_INVITES,
      Key: { inviteId },
    }),
  );
  return (res.Item as PwaInviteRecord | undefined) ?? null;
}

export async function getInviteByTokenHash(tokenHash: string) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  // Requires a GSI named `GSI_TokenHash` with PK = tokenHash.
  const res = await ddb.send(
    new QueryCommand({
      TableName: env.DDB_TABLE_PWA_INVITES,
      IndexName: "GSI_TokenHash",
      KeyConditionExpression: "tokenHash = :h",
      ExpressionAttributeValues: { ":h": tokenHash },
      Limit: 1,
    }),
  );

  const item = res.Items?.[0] as PwaInviteRecord | undefined;
  return item ?? null;
}

async function revokeActiveInvites(params: { estateId: string; nowIso: string }) {
  const env = getEnv();
  const ddb = getDdbDocClient();

  // Requires a GSI named `GSI_EstateType` with PK = estateTypeKey.
  const types: PwaInviteType[] = ["RESIDENT", "SECURITY"];

  for (const type of types) {
    const estateTypeKey = `ESTATE#${params.estateId}#TYPE#${type}`;
    const res = await ddb.send(
      new QueryCommand({
        TableName: env.DDB_TABLE_PWA_INVITES,
        IndexName: "GSI_EstateType",
        KeyConditionExpression: "estateTypeKey = :k",
        ExpressionAttributeValues: { ":k": estateTypeKey },
        Limit: 25,
      }),
    );

    const items = (res.Items as PwaInviteRecord[] | undefined) ?? [];
    const active = items.filter((i) => !i.revokedAt && i.expiresAt > params.nowIso);

    for (const invite of active) {
      await ddb.send(
        new UpdateCommand({
          TableName: env.DDB_TABLE_PWA_INVITES,
          Key: { inviteId: invite.inviteId },
          UpdateExpression: "SET revokedAt = :r",
          ExpressionAttributeValues: { ":r": params.nowIso },
        }),
      );
    }
  }
}

export async function createNewPwaLinks(params: {
  estateId: string;
  createdByUserId: string;
  expiresAtIso: string;
}) {
  const nowIso = new Date().toISOString();

  // Revoke existing active invites for this estate (best-effort).
  await revokeActiveInvites({ estateId: params.estateId, nowIso });

  const residentToken = randomToken();
  const securityToken = randomToken();

  const residentHash = sha256Base64Url(residentToken);
  const securityHash = sha256Base64Url(securityToken);

  const residentInvite: PwaInviteRecord = {
    inviteId: `inv_${nanoid(12)}`,
    tokenHash: residentHash,
    estateId: params.estateId,
    type: "RESIDENT",
    createdByUserId: params.createdByUserId,
    createdAt: nowIso,
    expiresAt: params.expiresAtIso,
    estateTypeKey: `ESTATE#${params.estateId}#TYPE#RESIDENT`,
  };

  const securityInvite: PwaInviteRecord = {
    inviteId: `inv_${nanoid(12)}`,
    tokenHash: securityHash,
    estateId: params.estateId,
    type: "SECURITY",
    createdByUserId: params.createdByUserId,
    createdAt: nowIso,
    expiresAt: params.expiresAtIso,
    estateTypeKey: `ESTATE#${params.estateId}#TYPE#SECURITY`,
  };

  const env = getEnv();
  const ddb = getDdbDocClient();

  // Attempt to write both invites atomically.
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: env.DDB_TABLE_PWA_INVITES,
              Item: residentInvite,
              ConditionExpression: "attribute_not_exists(inviteId)",
            },
          },
          {
            Put: {
              TableName: env.DDB_TABLE_PWA_INVITES,
              Item: securityInvite,
              ConditionExpression: "attribute_not_exists(inviteId)",
            },
          },
        ],
      }),
    );
  } catch {
    // Fallback (still avoids Prisma). Worst case: duplicates may happen until indexes are in place.
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_PWA_INVITES, Item: residentInvite }));
    await ddb.send(new PutCommand({ TableName: env.DDB_TABLE_PWA_INVITES, Item: securityInvite }));
  }

  return {
    residentToken,
    securityToken,
    expiresAtIso: params.expiresAtIso,
  };
}
