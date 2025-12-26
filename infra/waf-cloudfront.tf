locals {
  frontdoor_enabled = var.enable_cloudfront_frontdoor

  # Cookies that must be forwarded to preserve auth in SSR/API.
  forwarded_cookies = [
    "bs_session",
    "bs_access",
    "bs_refresh",
    "bs_mfa_challenge",
    "bs_mfa_setup",
  ]
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

resource "aws_cloudfront_origin_request_policy" "forward_auth" {
  count   = local.frontdoor_enabled ? 1 : 0
  name    = "${var.project_name}-forward-auth"
  comment = "Forward auth cookies + origin headers for Next.js SSR/API"

  cookies_config {
    cookie_behavior = "whitelist"
    cookies {
      items = local.forwarded_cookies
    }
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "Referer",
        "User-Agent",
        "Sec-Fetch-Site",
        "Sec-Fetch-Mode",
        "Sec-Fetch-Dest",
        "X-Forwarded-For",
        "X-Forwarded-Proto",
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_wafv2_web_acl" "frontdoor" {
  provider = aws.us_east_1
  count    = local.frontdoor_enabled ? 1 : 0

  name  = "${var.project_name}-frontdoor"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimitApi"
    priority = 20

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit_api_5m
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            field_to_match {
              uri_path {}
            }
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitApi"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "Frontdoor"
    sampled_requests_enabled   = true
  }
}

resource "aws_cloudfront_distribution" "frontdoor" {
  count = local.frontdoor_enabled ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.project_name} front door"

  origin {
    domain_name = var.frontend_origin_domain
    origin_id   = "amplify-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "amplify-origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.forward_auth[0].id

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = length(var.frontend_custom_domain) > 0 ? [var.frontend_custom_domain] : []

  viewer_certificate {
    cloudfront_default_certificate = length(var.acm_certificate_arn_us_east_1) == 0
    acm_certificate_arn            = length(var.acm_certificate_arn_us_east_1) > 0 ? var.acm_certificate_arn_us_east_1 : null
    ssl_support_method             = length(var.acm_certificate_arn_us_east_1) > 0 ? "sni-only" : null
    minimum_protocol_version       = length(var.acm_certificate_arn_us_east_1) > 0 ? "TLSv1.2_2021" : null
  }

  web_acl_id = aws_wafv2_web_acl.frontdoor[0].arn

  lifecycle {
    precondition {
      condition     = var.frontend_origin_domain != ""
      error_message = "frontend_origin_domain must be set when enable_cloudfront_frontdoor is true"
    }
  }
}
