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

variable "enable_cloudfront_frontdoor" {
  type        = bool
  description = "Whether to provision a Terraform-managed CloudFront + WAF front door in front of Amplify"
  default     = false
}

variable "frontend_origin_domain" {
  type        = string
  description = "Origin domain name for the frontend (e.g. main.<appId>.amplifyapp.com)"
  default     = ""
}

variable "frontend_custom_domain" {
  type        = string
  description = "Optional custom domain to attach to CloudFront (requires ACM cert in us-east-1)"
  default     = ""
}

variable "acm_certificate_arn_us_east_1" {
  type        = string
  description = "ACM certificate ARN in us-east-1 for the custom domain (CloudFront requirement)"
  default     = ""
}

variable "waf_rate_limit_api_5m" {
  type        = number
  description = "WAF rate-based rule limit per IP over 5 minutes for /api/*"
  default     = 2000
}
