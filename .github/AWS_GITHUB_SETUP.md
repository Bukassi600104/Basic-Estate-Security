# GitHub → AWS deploy setup (OIDC)

This repo includes a GitHub Actions workflow to deploy to AWS (ECR + Terraform apply + optional ECS one-off migrations/seed).

## 1) Create an AWS IAM Role for GitHub OIDC

- Create an IAM OIDC provider for GitHub Actions:
  - Provider URL: `https://token.actions.githubusercontent.com`
  - Audience: `sts.amazonaws.com`

- Create an IAM role with a trust policy allowing your repo to assume it.
  - Restrict by `sub` to your repo, e.g. `repo:OWNER/REPO:*`.

- Attach permissions needed for:
  - ECR push
  - ECS (cluster/service/task/run-task)
  - ELBv2
  - CloudFront
  - RDS
  - VPC/IAM (for initial provisioning)

Minimal/secure IAM is environment-specific; start broad for bootstrapping, then tighten.

## 2) Create Terraform remote state resources

Terraform backend cannot bootstrap itself. Create these once:

- S3 bucket for state (example): `basic-security-tf-state-<account>`
- DynamoDB table for lock (example): `basic-security-tf-locks` with partition key `LockID` (String)

In `infra/`:

- Copy `backend.hcl.example` → `backend.hcl` and fill bucket/table.
- Commit `backend.hcl`? **No** (it’s intentionally ignored). You can store these values as GitHub secrets instead and generate it in CI.

## 3) GitHub secrets required

Add these in GitHub → Settings → Secrets and variables → Actions:

- `AWS_ROLE_TO_ASSUME` (ARN of the IAM role)

Terraform remote state:

- `TF_STATE_BUCKET` (S3 bucket name)
- `TF_STATE_DDB_TABLE` (DynamoDB lock table name)
- `TF_STATE_KEY` (optional; defaults to `basic-security/terraform.tfstate`)

Optional:

- `APP_SECRETS_NAME` (only if you want something other than `prod/app-secrets`)

## 3.1) App secrets (stored in AWS, not GitHub)

Create an AWS Secrets Manager secret (JSON) named `prod/app-secrets` with keys:

- `AUTH_JWT_SECRET`
- `TELEGRAM_BOT_TOKEN` (optional)
- `TELEGRAM_WEBHOOK_SECRET` (optional, recommended)

ECS injects these at runtime; GitHub Actions does not store them.

## 4) Backend config

The deploy workflow generates `infra/backend.hcl` at runtime from GitHub secrets and runs:

- `terraform init -backend-config=backend.hcl`

## 5) Run the deploy workflow (recommended first run)

In GitHub → Actions → "Deploy (AWS ECS + RDS)" → Run workflow:

- `image_tag`: keep default (`prod`)
- `desired_count`: set to `0` for the first run (infra + DB only)
- `run_migrations`: `true`
- `run_seed`: `false` (seed requires `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` env vars)

After it finishes, copy the CloudFront URL from the workflow logs:

- Web app: `https://<cloudfront-domain>/`
- Telegram webhook: `https://<cloudfront-domain>/api/telegram/webhook`

Then run the workflow again with:

- `desired_count`: `1`
- `run_migrations`: `true`
- `run_seed`: `false`
