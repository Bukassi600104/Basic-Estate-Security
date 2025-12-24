# AWS setup (no GitHub secrets)

Production best-practice for this repo is:

- Connect AWS Amplify Hosting to the GitHub repo for build/deploy (Amplify handles this)
- Provision Cognito + DynamoDB via Terraform from a trusted operator machine (local)
- Store runtime configuration only in AWS (Amplify environment variables + IAM role permissions)

This avoids GitHub Actions + GitHub Secrets entirely.

## 1) Create Terraform remote state (recommended)

Terraform backend cannot bootstrap itself. Create these once in `us-east-1`:

- S3 bucket for state (example): `basic-estate-security-tf-state-<account>`
- DynamoDB table for lock (example): `basic-estate-security-tf-locks` with partition key `LockID` (String)

## 2) Provision Cognito + DynamoDB (Terraform, local)

From `infra/`:

1) Copy `backend.hcl.example` → `backend.hcl` and fill bucket/table/region.
   - Do NOT commit `backend.hcl` (it’s ignored by git).

2) Initialize and apply:

- `terraform init -backend-config=backend.hcl`
- `terraform apply`

3) Read outputs:

- `terraform output -raw region`
- `terraform output -raw cognito_user_pool_id`
- `terraform output -raw cognito_client_id`
- `terraform output -raw amplify_ssr_policy_arn`

## 3) Configure Amplify (all secrets stay in AWS)

Amplify Console → your app → App settings → Environment variables:

- `AWS_REGION=us-east-1`
- `COGNITO_USER_POOL_ID` (Terraform output)
- `COGNITO_CLIENT_ID` (Terraform output)
- `COGNITO_USER_POOL_REGION=us-east-1`
- All `DDB_TABLE_*` values (Terraform outputs)

## 4) Grant Amplify SSR permissions (required)

IAM Console → locate Amplify’s SSR execution role → attach the IAM policy from Terraform output:

- `amplify_ssr_policy_arn`

Without this, server-side routes calling DynamoDB/Cognito will fail with authorization errors.
