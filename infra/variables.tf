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
