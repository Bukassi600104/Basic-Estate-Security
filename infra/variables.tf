variable "aws_region" {
  type        = string
  description = "AWS region to deploy into"
  default     = "eu-north-1"
}

variable "project_name" {
  type        = string
  description = "Name prefix for resources"
  default     = "basic-estate-security"
}
