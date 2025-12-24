output "region" {
  value = var.aws_region
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_task_definition_arn" {
  value = aws_ecs_task_definition.app.arn
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "public_subnet_ids" {
  value = local.subnet_ids
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
