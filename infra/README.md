# AWS Terraform

Terraform to deploy the Next.js app to AWS with AWS-native persistence and auth:

- ECR repository
- ECS Fargate service (public subnets, `assign_public_ip = true`)
- ALB (HTTP) + target group health check on `GET /api/healthz`
- CloudFront distribution in front of the ALB (HTTPS on `*.cloudfront.net`, no custom domain required)
- DynamoDB tables (multi-table)
- Cognito User Pool + App Client (Terraform creates them; app reads `COGNITO_USER_POOL_ID` + `COGNITO_CLIENT_ID`)

## Prereqs

- Terraform >= 1.6
- AWS credentials configured locally (`aws configure` or environment vars)

If you deploy via GitHub Actions, prefer remote state (S3 + DynamoDB lock table).

## 1) Deploy the infrastructure

From this folder:

- Create remote state (recommended for GitHub Actions):
   - Create an S3 bucket for state (example name: `basic-security-tf-state-<account>`)
   - Create a DynamoDB table for locks (example name: `basic-security-tf-locks`, partition key `LockID` string)
   - Copy `backend.hcl.example` → `backend.hcl` and fill in bucket/table
   - Run: `terraform init -backend-config=backend.hcl`

- Copy `terraform.tfvars.example` → `terraform.tfvars` and fill values
- `terraform apply`

Tip: for the very first apply, set `desired_count = 0` until you have pushed an image to ECR and updated `container_image`.

After apply, Terraform outputs:

- `ecr_repository_url`
- `cloudfront_domain_name` (your public HTTPS host)
- `alb_dns_name`

It also creates DynamoDB tables with GSIs that the app expects.

## 2) Build and push the app image to ECR

From repo root:

1. Build image:
   - `docker build -t basic-security:prod .`

2. Tag for ECR and push (replace placeholders):
   - `aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.eu-north-1.amazonaws.com`
   - `docker tag basic-security:prod <account>.dkr.ecr.eu-north-1.amazonaws.com/basic-security:prod`
   - `docker push <account>.dkr.ecr.eu-north-1.amazonaws.com/basic-security:prod`

3. Update `container_image` in `terraform.tfvars` and re-apply:
   - `terraform apply`

## Migration note

If you previously deployed an older “RDS/Prisma” stack from this folder, this configuration is intentionally different (DynamoDB + Cognito).

- Expect `terraform plan` to show large changes (including removing RDS resources).
- Treat this as a cutover, not an in-place DB migration. DynamoDB tables will start empty unless you backfill.
- If you still need the old stack, use a separate Terraform state/key (or workspace) so applies don’t destroy it.

## Notes / trade-offs (intentional for minimal setup)

- ECS tasks run in public subnets with public IPs to avoid requiring a NAT gateway.
- CloudFront caching is disabled and all viewer values are forwarded to avoid breaking cookie auth.
- For scaling beyond a few tasks, consider tightening CloudFront forwarding policies.
