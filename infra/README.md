# Legacy AWS Terraform

This folder contains legacy AWS Terraform from the earlier Amplify/Cognito/DynamoDB architecture.

The current production stack is:

- Vercel for the Next.js app
- Supabase Auth for authentication
- Supabase Postgres for persistence

Do not apply this Terraform for the current Supabase deployment. It remains only as historical reference until the AWS files are removed or replaced with infrastructure docs for Vercel/Supabase.

Current database setup lives in `../supabase/migrations`.
