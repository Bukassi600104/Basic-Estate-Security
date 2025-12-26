output "region" {
  value = var.aws_region
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.this.id
}

output "ddb_table_estates" {
  value = aws_dynamodb_table.estates.name
}

output "ddb_table_users" {
  value = aws_dynamodb_table.users.name
}

output "ddb_table_residents" {
  value = aws_dynamodb_table.residents.name
}

output "ddb_table_codes" {
  value = aws_dynamodb_table.codes.name
}

output "ddb_table_gates" {
  value = aws_dynamodb_table.gates.name
}

output "ddb_table_validation_logs" {
  value = aws_dynamodb_table.validation_logs.name
}

output "ddb_table_activity_logs" {
  value = aws_dynamodb_table.activity_logs.name
}

output "ddb_table_pwa_invites" {
  value = aws_dynamodb_table.pwa_invites.name
}

output "ddb_table_uniq" {
  value = aws_dynamodb_table.uniq.name
}

output "ddb_table_rate_limits" {
  value = aws_dynamodb_table.rate_limits.name
}

output "amplify_ssr_policy_arn" {
  value = aws_iam_policy.amplify_ssr_access.arn
}

output "frontdoor_cloudfront_domain_name" {
  value = try(aws_cloudfront_distribution.frontdoor[0].domain_name, null)
}

output "frontdoor_cloudfront_distribution_id" {
  value = try(aws_cloudfront_distribution.frontdoor[0].id, null)
}

output "frontdoor_waf_web_acl_arn" {
  value = try(aws_wafv2_web_acl.frontdoor[0].arn, null)
}
