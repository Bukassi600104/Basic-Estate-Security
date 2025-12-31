# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment Workflow

**IMPORTANT**: This project is deployed to AWS Amplify and tested in production (not locally).

1. After making changes, **always commit and push to GitHub**
2. **Always ask the user before pushing** - never push without confirmation
3. AWS Amplify auto-deploys from the `main` branch
4. Test changes on the live production site after deployment

```bash
git add -A && git commit -m "message"
git push origin main  # Ask user before running this
```

## Build & Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Next.js dev server on :3000
npm run build            # Production build (strict TypeScript)
npm run lint             # ESLint with Next.js config
npm run db:clear         # Wipe all DynamoDB data (dev only)
npm run dev:delete-user  # Remove test user from Cognito
```

## Project Overview

Role-based security pass system for gated estates. Residents generate guest/staff access codes, guards validate codes at gates, admins manage residents and view logs, super admins oversee all estates.

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + AWS Cognito + DynamoDB

## Architecture

### Layered Structure
```
src/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # Shared React components
├── lib/
│   ├── auth/         # Session, JWT verification, current-user
│   ├── aws/          # Cognito + DynamoDB SDK clients
│   ├── repos/        # Data access layer (8 repository modules)
│   ├── security/     # Rate limiting, CSRF protection
│   └── env.ts        # Strict env validation with Zod
└── middleware.ts     # Route protection, MFA enforcement
```

### Repository Pattern
All DynamoDB access goes through `src/lib/repos/*.ts`. Each module exposes typed read/write functions using AWS SDK Document Client. Available repos: `codes`, `users`, `residents`, `estates`, `gates`, `validation-logs`, `activity-logs`, `pwa-invites`.

### Role-Based Access Control (5 Roles)

**Platform-Level (Internal):**
- `SUPER_ADMIN` - Platform owner/developer only. Monitors all estates, views analytics, receives alerts, checks app health and security. NOT visible to end users. Created via `scripts/create-super-admin.mjs`. MFA required.

**Estate-Level (End Users):**
- `ESTATE_ADMIN` - Estate administrator who self-registers via `/auth/sign-up`. Manages their estate: onboards residents, creates guards, views logs. MFA required.
- `RESIDENT` - Generates guest/staff access codes for their house
- `RESIDENT_DELEGATE` - Resident-approved phone number that can generate codes on behalf of resident
- `GUARD` - Security personnel who validates codes at gates

**Key Distinction:**
- Super Admin = Platform owner (you, the developer) - monitors the entire webapp
- Estate Admin = Customer - registers their estate and manages it independently

Roles stored in Cognito custom attribute `custom:role`. Use guards from `src/lib/auth/guards.ts` in API routes.

### Multi-Tenant Isolation
All records scoped by `estateId`. Every mutation must validate `assertTenant()` to prevent cross-estate access. Session carries `estateId`; every operation checks tenant boundary.

## Key Patterns

### API Route Guards
```typescript
import { requireApiCurrentUser, requireRoleSession, assertTenant } from '@/lib/auth/guards';

// In API route:
const session = await requireRoleSession('ESTATE_ADMIN', 'SUPER_ADMIN');
const user = await requireApiCurrentUser();
assertTenant(entity.estateId, session.estateId);
```

### Rate Limiting
```typescript
import { rateLimitHybrid } from '@/lib/security/rate-limit-hybrid';

// For auth endpoints (fail-closed):
await rateLimitHybrid({ key: `login:${ip}:${username}`, limit: 10, windowSec: 60 }, 'LOGIN');

// For operations (fail-open):
await rateLimitHybrid({ key: `api:${ip}`, limit: 100, windowSec: 60 }, 'OPS');
```

### CSRF Protection
Mutations (POST/PATCH/DELETE) must call `enforceSameOriginForMutations(request)` from `src/lib/security/same-origin.ts`.

### DynamoDB Keys
Composite keys for hierarchical data: `ESTATE#{estateId}#RESOURCE#{id}`. Always Query on GSIs, avoid Scan.

## Code Validation Flow

**Guest codes**: 6-digit, single-use, 6-hour TTL. Marked USED atomically on successful validation.

**Staff codes**: 6-digit, renewable, 183-day TTL. Not consumed on validation. Resident can renew via API.

Validation happens in `src/app/api/guard/validate/route.ts` - atomic lookup, status check, write ValidationLog.

## Environment Variables

Required (from Terraform outputs):
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
- 10 DynamoDB table names: `DDB_TABLE_ESTATES`, `DDB_TABLE_USERS`, `DDB_TABLE_RESIDENTS`, `DDB_TABLE_CODES`, `DDB_TABLE_GATES`, `DDB_TABLE_VALIDATION_LOGS`, `DDB_TABLE_ACTIVITY_LOGS`, `DDB_TABLE_PWA_INVITES`, `DDB_TABLE_UNIQ`, `DDB_TABLE_RATE_LIMITS`
- `AWS_REGION` (default: eu-north-1)

## Infrastructure

Terraform configs in `/infra/` provision Cognito User Pool and DynamoDB tables. Deploy target is AWS Amplify Hosting (requires attached IAM policy for SSR execution role).

## Path Alias

`@/` maps to `./src/` (configured in tsconfig.json).
