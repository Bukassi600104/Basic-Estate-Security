# Supabase and Vercel Setup

The current production workflow is Vercel + Supabase:

- Vercel hosts the Next.js app from `main`.
- Supabase project `kdjmxckeieenpmpmymft` provides Auth and Postgres.
- Database migrations live in `supabase/migrations`.
- Runtime secrets belong in Vercel environment variables, not GitHub.

Do not provision the old Cognito, DynamoDB, or Amplify stack for the current app.
