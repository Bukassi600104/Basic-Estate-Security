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

output "rds_endpoint" {
  value = aws_db_instance.mysql.address
}

output "rds_port" {
  value = aws_db_instance.mysql.port
}

output "db_username" {
  value = var.db_username
}

output "db_password" {
  value     = local.effective_db_password
  sensitive = true
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
  value = [for s in aws_subnet.public : s.id]
}
