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
- `AUTH_JWT_SECRET` (min 20 chars)

Terraform remote state:

- `TF_STATE_BUCKET` (S3 bucket name)
- `TF_STATE_DDB_TABLE` (DynamoDB lock table name)
- `TF_STATE_KEY` (optional; defaults to `basic-security/terraform.tfstate`)

Optional (Telegram):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

## 4) Backend config

The deploy workflow generates `infra/backend.hcl` at runtime from GitHub secrets and runs:

- `terraform init -backend-config=backend.hcl`
