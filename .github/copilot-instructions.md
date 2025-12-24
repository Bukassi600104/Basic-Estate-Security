
# Copilot Instructions — Basic Estate Security

## Architecture & Data Flow
- **Next.js App Router** in `src/app/` (UI + API routes).
- **PWA-first**: Residents/guards use PWA (no Telegram/third-party dependency); web UI is for admins.
- **Persistence**: DynamoDB (multi-table). Prefer small repos in `src/lib/repos/*`.
- **Auth**: Cognito User Pool JWT in `bs_session` cookie (see `src/lib/auth/session.ts`). No NextAuth.

## Roles & Routing
- Roles: `User.role` (string: `SUPER_ADMIN`, `ESTATE_ADMIN`, `RESIDENT`, `RESIDENT_DELEGATE`, `GUARD`). Compare as string literals.
- Role router: `src/app/dashboard/page.tsx` (admins → dashboards, others → PWA guidance).
- Layouts enforce role access: `src/app/[role]/layout.tsx` (e.g., `estate-admin`, `resident`, `guard`, `super-admin`).
- Shared shell: `src/components/app-shell.tsx` (header, sign-out action).

## Code/Pass Rules
- **Guest codes**: On-demand, expire after 6h or on validation (`USED`, `expiresAt=now`).
- **Staff codes**: 183 days, renewable, validation does NOT expire them.
- **Suspension**: Suspended residents can’t generate codes; all their codes expire immediately.
- **Estate status**: If not `ACTIVE`, block PWA/code APIs.
- **Validation logging**: Every attempt logs a `ValidationLog` (success/failure, gate snapshot, user-safe `failureReason` on fail).

## API & Implementation Patterns
- Admin APIs: `src/app/api/estate-admin/*` (residents, gates, logs, settings, onboarding).
- Resident code APIs: `src/app/api/resident/codes/*` (generate/list/renew).
- Guard APIs: `src/app/api/guard/*` (lookup/validate).
- API routes: Always return `{ ok: true }` or `{ error }` (user-safe messages).
- Tenant boundaries: Always filter by `estateId` from session/user.
- Prefer small, focused route handlers over shared service layers.

## Developer Workflows (Windows/PowerShell)
- Use `*.cmd` shims (not `npm.ps1`/`npx.ps1`):
  - Install: `npm.cmd install`
  - Dev: `npm.cmd run dev`
- Local config:
  - Copy `.env.example` → `.env`
  - Set Cognito + DynamoDB env vars (see `src/lib/env.ts`)

## Infra & Deployment
- AWS: Amplify Hosting for Next.js SSR (target). DynamoDB + Cognito for data/auth.
- Health check: `GET /api/healthz`.

Legacy infra notes may still exist under `infra/` but Prisma/ECS migration commands are removed.

## Examples & References
- Role-based layouts: `src/app/estate-admin/layout.tsx`, etc.
- Auth/session: `src/lib/auth/session.ts`, `src/middleware.ts`.
- Code rules: `src/app/api/resident/codes/`, `src/app/api/guard/validate/`.
- Infra: `infra/README.md`.

---
If any section is unclear or incomplete, please provide feedback for further iteration.
