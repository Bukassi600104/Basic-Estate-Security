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

output "amplify_ssr_policy_arn" {
  value = aws_iam_policy.amplify_ssr_access.arn
}
