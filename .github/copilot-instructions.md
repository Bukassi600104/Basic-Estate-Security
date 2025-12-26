
# Copilot Instructions — Basic Estate Security

## What this repo is
- Next.js 14 App Router: UI + API live under `src/app/*`.
- Product split: admin dashboard vs PWA-first Resident/Security apps:
	- `src/app/resident-app/*`, `src/app/security-app/*` (install/claim flows)
	- PWA assets in `public/resident-app/*`, `public/security-app/*`
- Persistence: DynamoDB multi-table via thin repos in `src/lib/repos/*` (prefer extending repos over ad-hoc DDB calls).
- Auth: AWS Cognito User Pool; IdToken is stored as `bs_session` cookie (`src/lib/auth/session.ts`). No NextAuth.

## Roles + request context
- Roles are string literals: `SUPER_ADMIN | ESTATE_ADMIN | RESIDENT | RESIDENT_DELEGATE | GUARD`.
- Middleware only checks “signed-in” for protected prefixes (`src/middleware.ts`). Role gating happens in pages/layouts and API routes.
- Current user lookup is: session → user profile (DDB) → estate (DDB) via `requireCurrentUser()` (`src/lib/auth/current-user.ts`). It returns `null` (don’t assume throw).

## API route conventions (match existing patterns)
- Validate inputs with `zod` inside the route (e.g. `src/app/api/auth/sign-in/route.ts`).
- Responses are JSON: success `{ ok: true, ... }`, failure `{ error: string }` with user-safe messages.
- Cookie-authenticated mutations must call `enforceSameOriginForMutations(req)` (`src/lib/security/same-origin.ts`).
- Add per-route rate limiting via `rateLimit({ key, limit, windowMs })` keyed by IP/user when relevant (`src/lib/security/rate-limit.ts`).
- Always enforce tenant boundaries: require user `estateId`, and verify loaded entities match it.
- Routes that use Node-only APIs (Cognito admin, `node:crypto`) set `export const runtime = "nodejs"` (see `src/app/api/auth/sign-in/route.ts`).

## Domain rules (codes + validation)
- Estate must be `ACTIVE` for guard/resident code flows (checked in routes).
- Residents must be `APPROVED` to generate/renew; `SUSPENDED` blocks actions.
- Guest codes: single-use 6h TTL; on successful validation, atomically mark `USED` and write a `ValidationLog` (`src/app/api/guard/validate/route.ts`).
- Staff codes: 183-day TTL; guard validation does not expire them; renewal extends expiry (`src/app/api/resident/codes/[codeId]/renew/route.ts`).
- Every guard validate attempt writes a `ValidationLog` (success/failure + `failureReason`).

## DynamoDB modeling assumptions
- GSI names are fixed in code: typically `GSI1`, sometimes `GSI2` (e.g. code lookup by `codeId`).
- Key shapes are intentional: `CodeRecord.codeKey = ESTATE#{estateId}#CODE#{codeValue}` and `residentKey = ESTATE#{estateId}#RESIDENT#{residentId}` (`src/lib/repos/codes.ts`).
- Some list/read paths may fall back to `Scan` if a GSI isn’t provisioned yet or older items lack indexed attributes (migration safety net; see `README.md`). Avoid relying on this in production.
- Infra + recommended GSIs are documented in `README.md` and `infra/README.md`.

## Developer workflow (Windows)
- Install/run/lint: `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run lint`.
- Local env: copy `.env.example` → `.env`; env is validated strictly via `zod` (`src/lib/env.ts`).
- Useful scripts: `npm.cmd run db:clear`, `npm.cmd run dev:delete-user`, and `scripts/probe-prod-signup.ps1`.

If anything about the DynamoDB indexes/keys is unclear for your change, tell me which entity/route you’re touching and I’ll tighten the guidance.
