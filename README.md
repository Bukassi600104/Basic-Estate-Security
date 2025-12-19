# Basic Security

A security pass system for estates: residents generate guest/staff codes, guards validate them, admins onboard residents and view activity logs, and super admins oversee all estates.

## Local dev

1. Install deps:
   - `npm install`
2. Create `.env` from `.env.example` and set `AUTH_JWT_SECRET`.
3. Set up DB:
   - `npm run db:push`
   - `npm run db:seed` (optional)
4. Run:
   - `npm run dev`

## Production (AWS: eu-north-1, no custom domain yet)

This repo is a Next.js App Router app (UI + API routes). The recommended AWS path is:

- **RDS MySQL** for the database (fresh start).
- **ECS Fargate** running the containerized app.
- **ALB** in front of ECS.
- **CloudFront** in front of the ALB to provide HTTPS with the default `*.cloudfront.net` domain.

### Required environment variables

- `DATABASE_URL` (MySQL connection string)
- `AUTH_JWT_SECRET` (min 20 chars)

Optional (Telegram):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (recommended in production)

### Health checks

- Use `GET /api/healthz` for ALB/CloudFront health checks.

### Telegram webhook

- Webhook path is fixed at `/api/telegram/webhook`.
- Without a custom domain, use the CloudFront domain:
   - `https://<distribution>.cloudfront.net/api/telegram/webhook`

You can set or inspect the webhook using:

- `npm run tg:webhook:set -- https://<public-host>/api/telegram/webhook`
- `npm run tg:webhook:info`
- `npm run tg:webhook:delete`

## Roles

- **SUPER_ADMIN**: oversees all estates.
- **ESTATE_ADMIN**: onboards residents and views estate logs.
- **RESIDENT**: generates guest/staff codes.
- **RESIDENT_DELEGATE**: resident-approved number that can generate codes.
- **GUARD**: validates codes and records allow/deny decisions.
