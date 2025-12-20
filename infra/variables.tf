variable "aws_region" {
  type        = string
  description = "AWS region to deploy into"
  default     = "eu-north-1"
}

variable "project_name" {
  type        = string
  description = "Name prefix for resources"
  default     = "basic-security"
}

variable "container_image" {
  type        = string
  description = "Full container image URI for the ECS task (e.g., <account>.dkr.ecr.eu-north-1.amazonaws.com/<repo>:<tag>)"
}

variable "app_port" {
  type        = number
  description = "Container/listener port for the Next.js app"
  default     = 3000
}

variable "desired_count" {
  type        = number
  description = "Number of ECS tasks"
  default     = 0
}

variable "app_secrets_name" {
  type        = string
  description = "AWS Secrets Manager secret name that stores app secrets as JSON (AUTH_JWT_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET)."
  default     = "prod/app-secrets"
}

variable "telegram_enabled" {
  type        = bool
  description = "If true, inject TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from the JSON secret. If those keys are missing, ECS task startup will fail."
  default     = false
}

variable "db_name" {
  type        = string
  description = "RDS database name"
  default     = "basic_security"
}

variable "db_username" {
  type        = string
  description = "RDS master username"
  default     = "admin"
}

variable "db_password" {
  type        = string
  description = "RDS master password (leave empty to auto-generate)"
  default     = ""
  sensitive   = true
}

variable "db_allocated_storage" {
  type        = number
  description = "RDS allocated storage (GB)"
  default     = 20
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"
}
