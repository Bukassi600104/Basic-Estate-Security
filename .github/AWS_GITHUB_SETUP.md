# GitHub → AWS provisioning setup (OIDC)

This repo includes a GitHub Actions workflow that **provisions the data/auth layer** used by the app when hosted on **AWS Amplify Hosting (Next.js SSR)**:

- DynamoDB tables
- Cognito User Pool + App Client
- An IAM policy you attach to the Amplify SSR execution role

## 1) Create an AWS IAM Role for GitHub OIDC

- Create an IAM OIDC provider for GitHub Actions:
  - Provider URL: `https://token.actions.githubusercontent.com`
  - Audience: `sts.amazonaws.com`

- Create an IAM role with a trust policy allowing your repo to assume it.
  - Restrict by `sub` to your repo, e.g. `repo:OWNER/REPO:*`.

- Attach permissions needed for:
  - DynamoDB (create tables, update/describe)
  - Cognito IDP (create user pool/client)
  - IAM (create policy)
  - S3 + DynamoDB (Terraform remote state bucket + lock table)

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

The workflow uses a fixed state key `${PROJECT_NAME}/terraform.tfstate`.

## 4) Backend config

The deploy workflow generates `infra/backend.hcl` at runtime from GitHub secrets and runs:

- `terraform init -backend-config=backend.hcl`

## 5) Run the deploy workflow (recommended first run)

In GitHub → Actions → "Provision AWS (DynamoDB + Cognito)" → Run workflow.

After it finishes, use the workflow outputs to:

1) Set Amplify environment variables:
  - `AWS_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` (and the `DDB_TABLE_*` values from Terraform outputs)

2) Attach the output `amplify_ssr_policy_arn` to the Amplify SSR execution role.
