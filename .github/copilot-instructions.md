# Copilot Instructions - Estate Security

## Project Shape

- Next.js 14 App Router: UI and API routes live under `src/app/*`.
- Shared server/data code lives under `src/lib/*`.
- All Postgres access should go through `src/lib/repos/*` or explicit Supabase RPCs.
- Auth uses Supabase SSR cookies via `@supabase/ssr`; no NextAuth.

## Backend

- Persistence is Supabase Postgres.
- Server-side privileged access uses `src/lib/supabase/admin.ts`.
- Browser/session access uses `src/lib/supabase/client.ts`.
- RLS is enabled in the schema, but v1 database access is intentionally through server-side API routes with service-role access.

## API Conventions

- Validate request bodies with `zod`.
- Cookie-authenticated mutations must call `enforceSameOriginForMutations(req)` or `enforceSameOriginOr403(req)`.
- Use `rateLimitHybrid` for login and operational endpoints.
- Always enforce tenant boundaries with `estateId`.
- Routes using Node-only APIs should export `runtime = "nodejs"`.

## Domain Rules

- Estate must be `ACTIVE` for resident and guard flows.
- Residents must be `APPROVED` to generate or renew codes.
- Guest codes are single-use, 6-hour TTL, 8-digit Luhn codes.
- Staff codes are renewable, 183-day TTL, 8-digit Luhn codes.
- Guard validation attempts should write validation logs.

## Workflow

- Install/run/check: `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run lint`, `npm.cmd run build`.
- Supabase setup: `npm.cmd run db:link`, `npm.cmd run db:migrate`.
- Admin/demo setup: `npm.cmd run admin:create`, `npm.cmd run seed:demo`.
- Production deploys to Vercel from `main`; ask before pushing.
