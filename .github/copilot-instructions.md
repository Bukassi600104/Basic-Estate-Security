# Copilot instructions — Basic Security

## Big picture
- Next.js App Router app in `src/app/`.
- **Telegram-first** for residents and guards (bot menus + validation + code generation): webhook entrypoint in `src/app/api/telegram/webhook/route.ts`.
- Web UI is primarily for admins (estate admin + super admin).
- Persistence via Prisma + SQLite (`prisma/schema.prisma`, `prisma/dev.db`). Core domain data lives in: `Estate`, `User`, `Resident`, `Code`, `Gate`, `BotSession`, `ValidationLog`, `ActivityLog`.
- Auth is a lightweight JWT session cookie (no NextAuth):
  - Signing/verification: `src/lib/auth/session.ts`
  - Password hashing: `src/lib/auth/password.ts`
  - Current user loader for API routes: `src/lib/auth/current-user.ts`
  - Route protection: `src/middleware.ts` (redirects unauthenticated users from protected prefixes)

## Roles and routing conventions
- Roles are stored on `User.role` (string values like `ESTATE_ADMIN`, `RESIDENT`, `GUARD`). Prefer comparing roles with string literals (avoids enum export edge cases).
- Role router: `src/app/dashboard/page.tsx` routes admins to admin dashboards; guards/residents see a Telegram guidance panel.
- Segment layouts enforce role access + shared shell:
  - `src/app/estate-admin/layout.tsx`
  - `src/app/resident/layout.tsx`
  - `src/app/guard/layout.tsx`
  - `src/app/super-admin/layout.tsx`
- Shared authenticated UI shell (header + sign-out server action): `src/components/app-shell.tsx`.

## Telegram linking
- One bot; users are differentiated by their existing account phone number.
- Linking flow: user shares Telegram contact → match `User.phone` → write `User.telegramUserId`/`User.telegramUsername`.
- Environment variables (see `src/lib/env.ts` / `.env.example`):
  - `TELEGRAM_BOT_TOKEN` (required for bot features)
  - `TELEGRAM_WEBHOOK_SECRET` (optional; if set, webhook requires secret header)

## Code/pass rules (must keep consistent)
- Guest codes: generated on demand; expire after 6 hours OR immediately when validated (mark `USED`, set `expiresAt=now`).
- Domestic staff (“house help”) codes: expire after ~6 months (183 days), can be renewed, and validation must NOT invalidate them (remain `ACTIVE`).
- Resident suspension: blocks new code generation and expires all `ACTIVE` codes immediately (`status=EXPIRED`, `expiresAt=now`).
- Estate status: if `Estate.status !== ACTIVE`, block bot operations and code APIs.
- Validation logging:
  - Every validation attempt must write a `ValidationLog` record (success or failure).
  - Failures must be logged with `outcome=FAILED` + a user-safe `failureReason`.
  - Store gate snapshots (`gateId` and `gateName`) on logs.
- Implementations to follow:
  - Telegram bot flows: `src/app/api/telegram/webhook/route.ts`
  - Admin: residents/gates/settings/logs export under `src/app/api/estate-admin/*`
  - Web APIs (kept for admin/back-compat):
    - Generate/list/renew: `src/app/api/resident/codes/*`
    - Guard lookup/validate: `src/app/api/guard/*`
  - Estate admin resident onboarding (max 2 delegates): `src/app/api/estate-admin/residents/route.ts`

## Developer workflows (Windows / PowerShell)
- PowerShell execution policy may block `npm.ps1`/`npx.ps1`; use the `*.cmd` shims:
  - Install: `npm.cmd install`
  - Dev server: `npm.cmd run dev`
  - Prisma: `npx.cmd prisma db push` (use `--accept-data-loss` if Prisma prompts)
- DB bootstrap:
  - Copy `.env.example` → `.env` and set `AUTH_JWT_SECRET` (min 20 chars)
  - `npm.cmd run db:push`
  - Optional seed super admin: set `SUPER_ADMIN_*` env vars and run `npm.cmd run db:seed`

## Project patterns to preserve
- API routes return `{ ok: true }` and/or a `{ error }` string; keep error messages user-safe.
- Keep tenant boundaries: estate-scoped reads/writes must filter by `estateId` from session/user.
- Prefer small, single-purpose route handlers over shared “service layers” unless duplication becomes painful.
