# Basic Security

A security pass system for estates: residents generate guest/staff codes, guards validate them, admins onboard residents and view activity logs, and super admins oversee all estates.

## Local dev

1. Install deps:
   - `npm.cmd install`
2. Create `.env` from `.env.example` and set required AWS env vars (Cognito + DynamoDB tables).
3. Run:
   - `npm.cmd run dev`

## Production

Target deployment is **AWS Amplify Hosting** (Next.js SSR) with:

- **Cognito User Pool** for authentication
- **DynamoDB** for persistence

### Health checks

- Use `GET /api/healthz` for ALB/CloudFront health checks.

For Amplify, you can still use `GET /api/healthz` for smoke checks.


### Resident & Security PWAs

This project is **PWA-first** (no Telegram or third-party messaging dependency).
Estate admins generate install/claim links from the dashboard.

## Roles

- **SUPER_ADMIN**: oversees all estates.
- **ESTATE_ADMIN**: onboards residents and views estate logs.
- **RESIDENT**: generates guest/staff codes.
- **RESIDENT_DELEGATE**: resident-approved number that can generate codes.
- **GUARD**: validates codes and records allow/deny decisions.

## DynamoDB scaling (GSIs)

The app is designed to use **Query on GSIs** for scalable list operations. If GSIs are missing (or older items don’t have indexed attributes), some codepaths may fall back to `Scan` as a migration safety net (not recommended for production).

Recommended GSIs (names are fixed in code):

- `DDB_TABLE_ESTATES`
   - `GSI1`:
      - Partition key: `gsi1pk` (string, constant value `ESTATES`)
      - Sort key: `createdAt` (string)

- `DDB_TABLE_VALIDATION_LOGS`
   - `GSI1`:
      - Partition key: `estateId` (string)
      - Sort key: `validatedAt` (string)

- `DDB_TABLE_ACTIVITY_LOGS`
   - `GSI1`:
      - Partition key: `estateId` (string)
      - Sort key: `createdAt` (string)

- `DDB_TABLE_RESIDENTS`
   - `GSI1`:
      - Partition key: `estateId` (string)
      - Sort key: `houseNumber` (string)

- `DDB_TABLE_USERS`
   - `GSI1`:
      - Partition key: `estateId` (string)
      - Sort key: `createdAt` (string)

- `DDB_TABLE_CODES`
   - `GSI1`:
      - Partition key: `residentKey` (string, `ESTATE#{estateId}#RESIDENT#{residentId}`)
      - Sort key: `createdAt` (string)
   - `GSI2`:
      - Partition key: `codeId` (string)

- `DDB_TABLE_GATES`
   - `GSI1`:
      - Partition key: `estateId` (string)
      - Sort key: `name` (string)

If a GSI is not provisioned yet (or older items don’t have the new index attributes), the code may fall back to `Scan`.
