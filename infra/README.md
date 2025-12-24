# AWS Terraform (Data Plane)

Terraform to provision the **data/auth layer** used by the app when hosted on **AWS Amplify Hosting (Next.js SSR)**:

- DynamoDB tables (multi-table)
- Cognito User Pool + App Client
- IAM policy you attach to Amplify SSR execution role (so server routes can access DynamoDB/Cognito)

## Prereqs

- Terraform >= 1.6
- AWS credentials configured locally (`aws configure` or environment vars)

Region default is `us-east-1` (North Virginia).

Prefer remote state (S3 + DynamoDB lock table).

## 1) Deploy the infrastructure (Cognito + DynamoDB)

From this folder:

- Create remote state (recommended for GitHub Actions):
   - Create an S3 bucket for state (example name: `basic-security-tf-state-<account>`)
   - Create a DynamoDB table for locks (example name: `basic-security-tf-locks`, partition key `LockID` string)
   - Copy `backend.hcl.example` → `backend.hcl` and fill in bucket/table
   - Run: `terraform init -backend-config=backend.hcl`

- Copy `terraform.tfvars.example` → `terraform.tfvars` and fill values
- `terraform apply`

This stack does not deploy compute (Amplify hosts the Next.js app).

After apply, Terraform outputs:

- `cognito_user_pool_id`
- `cognito_client_id`
- `ddb_table_*` (table names)
- `amplify_ssr_policy_arn`

## 2) Configure AWS Amplify Hosting

1) In the AWS console, create an **Amplify Hosting** app and connect your GitHub repo.

2) Set Amplify environment variables (from Terraform outputs):

- `AWS_REGION` (use `us-east-1`)
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_USER_POOL_REGION` (set to `us-east-1`)
- `DDB_TABLE_ESTATES`, `DDB_TABLE_USERS`, `DDB_TABLE_RESIDENTS`, `DDB_TABLE_CODES`, `DDB_TABLE_GATES`,
  `DDB_TABLE_VALIDATION_LOGS`, `DDB_TABLE_ACTIVITY_LOGS`, `DDB_TABLE_PWA_INVITES`, `DDB_TABLE_UNIQ`

3) Attach the generated IAM policy to Amplify SSR execution role:

- Find Amplify’s service role / SSR execution role in IAM.
- Attach the policy ARN output by Terraform: `amplify_ssr_policy_arn`.

Without this, server-side routes that call DynamoDB/Cognito will fail at runtime with auth errors.

## Migration note

If you previously deployed an older stack from this folder, this configuration is intentionally different (DynamoDB + Cognito).

- Expect `terraform plan` to show large changes.
- Treat this as a cutover, not an in-place DB migration. DynamoDB tables will start empty unless you backfill.
- If you still need the old stack, use a separate Terraform state/key (or workspace) so applies don’t destroy it.

## Notes / trade-offs (intentional for minimal setup)

- DynamoDB + Cognito are provisioned by Terraform; the app runtime is hosted by Amplify.
