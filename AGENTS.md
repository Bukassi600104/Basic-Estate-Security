# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Deployment Workflow

**IMPORTANT**: This project is deployed to Vercel and tested in production (not locally).

1. After making changes, **always commit and push to GitHub**
2. The user has approved automatic pushes after completed work; push without asking again unless the user explicitly says not to push
3. Vercel auto-deploys from the `main` branch
4. Test changes on the live production site after deployment

```bash
git add -A && git commit -m "message"
git push origin main
```

## Build & Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Next.js dev server on :3000
npm run build            # Production build (strict TypeScript)
npm run lint             # ESLint with Next.js config
```

## Project Overview

Role-based security pass system for gated estates. Residents generate guest/staff access codes, guards validate codes at gates, admins manage residents and view logs, super admins oversee all estates.

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres) + Vercel

## Architecture

### Layered Structure
```
src/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # Shared React components
├── lib/
│   ├── auth/         # Session (Supabase SSR), guards, verification codes
│   ├── supabase/     # Supabase clients (admin + server)
│   ├── repos/        # Data access layer (8 repository modules)
│   ├── security/     # Rate limiting, CSRF protection
│   └── env.ts        # Strict env validation with Zod
└── middleware.ts     # Route protection via Supabase SSR session
```

### Repository Pattern
All Postgres access goes through `src/lib/repos/*.ts`. Each module exposes typed read/write functions using Supabase client. Available repos: `codes`, `users`, `residents`, `estates`, `gates`, `validation-logs`, `activity-logs`, `guard-shifts`.

### Supabase Clients
- `src/lib/supabase/client.ts` — Server-side client using `@supabase/ssr` with cookie-based sessions (anon key)
- `src/lib/supabase/admin.ts` — Admin client using service role key (bypasses RLS) for user management

### Role-Based Access Control (6 Roles)

**Platform-Level (Internal):**
- `SUPER_ADMIN` - Platform owner/developer only. Created via `scripts/create-super-admin.mjs`.

**Estate-Level (End Users):**
- `ESTATE_ADMIN` - Estate administrator who self-registers via `/auth/sign-up`
- `SUB_ADMIN` - Sub-administrator with limited permissions, created by estate admin
- `RESIDENT` - Generates guest/staff access codes for their house
- `RESIDENT_DELEGATE` - Resident-approved phone number that can generate codes
- `GUARD` - Security personnel who validates codes at gates

Roles stored in `users` table and Supabase Auth `user_metadata`. Use guards from `src/lib/auth/guards.ts` in API routes.

### Multi-Tenant Isolation
All records scoped by `estateId`. Session carries `estateId`; every operation checks tenant boundary.

## Key Patterns

### API Route Guards
```typescript
import { requireRoleSession, requireEstateId } from '@/lib/auth/guards';

const sessionRes = await requireRoleSession({ roles: ["ESTATE_ADMIN"] });
if (!sessionRes.ok) return sessionRes.response;

const estateIdRes = requireEstateId(sessionRes.value);
if (!estateIdRes.ok) return estateIdRes.response;
const estateId = estateIdRes.value;
```

### Rate Limiting
```typescript
import { rateLimitHybrid } from '@/lib/security/rate-limit-hybrid';

const rl = await rateLimitHybrid({
  category: "OPS",
  key: `api:${ip}`,
  limit: 100,
  windowMs: 60_000,
});
if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: rl.status });
```

### CSRF Protection
Mutations (POST/PATCH/DELETE) must call `enforceSameOriginForMutations(request)` from `src/lib/security/same-origin.ts`.

## Code Validation Flow

**Guest codes**: 8-digit with Luhn check, single-use, 6-hour TTL. Marked USED atomically on validation.

**Staff codes**: 8-digit with Luhn check, renewable, 183-day TTL. Not consumed on validation.

Validation happens in `src/app/api/guard/validate/route.ts`.

## Environment Variables

Required:
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)

Optional:
- `APP_URL` — Production URL

## Scripts

- `scripts/create-super-admin.mjs` — Create Super Admin account
- `scripts/seed-demo-estate.mjs` — Seed demo estate with sample data

## Path Alias

`@/` maps to `./src/` (configured in tsconfig.json).
