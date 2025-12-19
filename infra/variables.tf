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

variable "auth_jwt_secret" {
  type        = string
  description = "JWT signing secret for the app (AUTH_JWT_SECRET). Keep this stable."
  sensitive   = true
}

variable "telegram_bot_token" {
  type        = string
  description = "Telegram bot token (TELEGRAM_BOT_TOKEN). Optional if you won't use Telegram immediately."
  default     = ""
  sensitive   = true
}

variable "telegram_webhook_secret" {
  type        = string
  description = "Webhook secret header token (TELEGRAM_WEBHOOK_SECRET). Recommended in production."
  default     = ""
  sensitive   = true
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
