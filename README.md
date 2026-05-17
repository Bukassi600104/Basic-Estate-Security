# GatePilot

A role-based security pass system for gated estates. Residents generate guest and staff access codes, guards validate codes at gates, estate admins manage residents/guards/logs, and super admins oversee estates.

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase Auth and Postgres
- Vercel production deployment

## Local Development

1. Install dependencies:
   - `npm.cmd install`
2. Copy `.env.example` to `.env` and set Supabase values:
   - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Run the app:
   - `npm.cmd run dev`

## Supabase Setup

This repo is intended to use the hosted Supabase project `kdjmxckeieenpmpmymft`.

- Link the project: `npm.cmd run db:link`
- Apply migrations: `npm.cmd run db:migrate`
- Create the platform admin: `npm.cmd run admin:create`
- Seed the demo estate: `npm.cmd run seed:demo`

The app keeps database access behind server-side API routes and uses the Supabase service-role key only on the server. Do not commit `.env` or service-role credentials.

## Production

Production deploys through Vercel from `main`.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`

Before pushing production changes, run:

- `npm.cmd run lint`
- `npm.cmd run build`

## Health Checks

- `GET /api/healthz` checks the app process.
- `GET /api/readyz` verifies Supabase connectivity.

## Roles

- `SUPER_ADMIN`: platform owner/developer, created with `scripts/create-super-admin.mjs`.
- `ESTATE_ADMIN`: estate administrator who self-registers.
- `SUB_ADMIN`: limited estate administrator.
- `RESIDENT`: generates guest/staff codes.
- `RESIDENT_DELEGATE`: resident-approved delegate.
- `GUARD`: validates codes at gates and records decisions.

## Code Validation

- Guest codes are 8-digit Luhn codes, single-use, and expire after 6 hours.
- Staff codes are 8-digit Luhn codes, renewable, and expire after 183 days.
- Guest code consumption is handled by a Postgres RPC to prevent duplicate successful validations under repeated scans.
