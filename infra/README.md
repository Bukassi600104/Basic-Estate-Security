# AWS Terraform (eu-north-1) — ECS + ALB + CloudFront + RDS MySQL

This is a minimal Terraform setup to deploy the existing Next.js app to AWS:

- ECR repository
- ECS Fargate service (public subnets, `assign_public_ip = true`)
- ALB (HTTP) + target group health check on `GET /api/healthz`
- CloudFront distribution in front of the ALB (HTTPS on `*.cloudfront.net`, no custom domain required)
- RDS MySQL (private subnets, not publicly accessible)

## Prereqs

- Terraform >= 1.6
- AWS credentials configured locally (`aws configure` or environment vars)

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
- `rds_endpoint` (+ a generated `db_password` if you didn’t provide one)

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

## 3) Initialize DB schema (Prisma migrations)

This repo currently uses Prisma. After the service is up and `DATABASE_URL` points at RDS, run migrations.

Recommended production pattern:

- Generate an initial migration locally:
  - `npm run db:migrate`
- Deploy migrations against RDS:
  - `npm run db:migrate:deploy`

(You can run this from a machine that can reach RDS. For this minimal setup RDS is private, so run migrations from inside the VPC or temporarily from a bastion/SSM session.)

## 4) Telegram webhook

Once CloudFront is deployed, set Telegram webhook to:

- `https://<cloudfront_domain_name>/api/telegram/webhook`

You can set it using the repo scripts:

- `node scripts/telegram-webhook.mjs --url https://<cloudfront_domain_name>/api/telegram/webhook`

If you set `TELEGRAM_WEBHOOK_SECRET`, CloudFront must forward the header `x-telegram-bot-api-secret-token` (this Terraform uses an AllViewer origin request policy, which forwards headers).

## Notes / trade-offs (intentional for minimal setup)

- ECS tasks run in public subnets with public IPs so they can call Telegram APIs without requiring a NAT gateway.
- CloudFront caching is disabled and all viewer values are forwarded to avoid breaking cookie auth.
- For scaling beyond a few tasks, consider RDS Proxy and tighter CloudFront forwarding policies.
