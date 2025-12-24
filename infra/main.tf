resource "random_id" "name_suffix" {
  byte_length = 2
}

locals {
  name        = var.project_name
  unique_name = "${var.project_name}-${random_id.name_suffix.hex}"
  tags = {
    Project = var.project_name
  }

  # DynamoDB tables are the source of truth for app persistence.
  # Use stable names (no random suffix) so data survives redeploys.
  ddb_table_estates         = "${var.project_name}_Estates"
  ddb_table_users           = "${var.project_name}_Users"
  ddb_table_residents       = "${var.project_name}_Residents"
  ddb_table_codes           = "${var.project_name}_Codes"
  ddb_table_gates           = "${var.project_name}_Gates"
  ddb_table_validation_logs = "${var.project_name}_ValidationLogs"
  ddb_table_activity_logs   = "${var.project_name}_ActivityLogs"
  ddb_table_pwa_invites     = "${var.project_name}_PwaInvites"
  ddb_table_uniq            = "${var.project_name}_Uniq"

  # Avoid VPC quota issues by reusing the account's default VPC.
  # This keeps deployments idempotent even if Terraform state is lost.
  vpc_id     = data.aws_vpc.default.id
  subnet_ids = slice(sort(data.aws_subnets.default.ids), 0, 2)
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Cognito (auth)
resource "aws_cognito_user_pool" "this" {
  name = "${local.unique_name}-user-pool"

  # Use email as the username value.
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  schema {
    name                = "estateId"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "this" {
  name         = "${local.unique_name}-app-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  # Required for InitiateAuth USER_PASSWORD_AUTH used by the app.
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
}

# Security group for ALB (public)
resource "aws_security_group" "alb" {
  name        = "${local.unique_name}-alb-sg"
  description = "ALB security group"
  vpc_id      = local.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.unique_name}-alb-sg" })
}

# Security group for ECS tasks
resource "aws_security_group" "ecs" {
  name        = "${local.unique_name}-ecs-sg"
  description = "ECS tasks security group"
  vpc_id      = local.vpc_id

  ingress {
    description     = "From ALB to app"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.unique_name}-ecs-sg" })
}

# DynamoDB tables (app persistence)
resource "aws_dynamodb_table" "estates" {
  name         = local.ddb_table_estates
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "estateId"

  attribute {
    name = "estateId"
    type = "S"
  }
  attribute {
    name = "gsi1pk"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "gsi1pk"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "users" {
  name         = local.ddb_table_users
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
  attribute {
    name = "estateId"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "estateId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "residents" {
  name         = local.ddb_table_residents
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "residentId"

  attribute {
    name = "residentId"
    type = "S"
  }
  attribute {
    name = "estateId"
    type = "S"
  }
  attribute {
    name = "houseNumber"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "estateId"
    range_key       = "houseNumber"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "codes" {
  name         = local.ddb_table_codes
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "codeKey"

  attribute {
    name = "codeKey"
    type = "S"
  }
  attribute {
    name = "residentKey"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }
  attribute {
    name = "codeId"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "residentKey"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI2"
    hash_key        = "codeId"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "gates" {
  name         = local.ddb_table_gates
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "gateId"

  attribute {
    name = "gateId"
    type = "S"
  }

  attribute {
    name = "estateId"
    type = "S"
  }

  attribute {
    name = "name"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "estateId"
    range_key       = "name"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "validation_logs" {
  name         = local.ddb_table_validation_logs
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "logId"

  attribute {
    name = "logId"
    type = "S"
  }
  attribute {
    name = "estateId"
    type = "S"
  }
  attribute {
    name = "validatedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "estateId"
    range_key       = "validatedAt"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "activity_logs" {
  name         = local.ddb_table_activity_logs
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "activityId"

  attribute {
    name = "activityId"
    type = "S"
  }
  attribute {
    name = "estateId"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "estateId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "pwa_invites" {
  name         = local.ddb_table_pwa_invites
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "inviteId"

  attribute {
    name = "inviteId"
    type = "S"
  }
  attribute {
    name = "tokenHash"
    type = "S"
  }
  attribute {
    name = "estateTypeKey"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI_TokenHash"
    hash_key        = "tokenHash"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "GSI_EstateType"
    hash_key        = "estateTypeKey"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "uniq" {
  name         = local.ddb_table_uniq
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "uniqKey"

  attribute {
    name = "uniqKey"
    type = "S"
  }

  tags = local.tags
}

# ECR repo
resource "aws_ecr_repository" "app" {
  name                 = local.name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.unique_name}"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_ecs_cluster" "this" {
  name = "${local.name}-cluster"
  tags = local.tags
}

data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${local.unique_name}-ecs-task-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role: app runtime permissions (DynamoDB + Cognito Admin APIs)
resource "aws_iam_role" "ecs_task" {
  name               = "${local.unique_name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy" "ecs_task_app" {
  name = "${local.unique_name}-ecs-task-app"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDbAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:TransactWriteItems",
        ]
        Resource = flatten([
          for arn in [
            aws_dynamodb_table.estates.arn,
            aws_dynamodb_table.users.arn,
            aws_dynamodb_table.residents.arn,
            aws_dynamodb_table.codes.arn,
            aws_dynamodb_table.gates.arn,
            aws_dynamodb_table.validation_logs.arn,
            aws_dynamodb_table.activity_logs.arn,
            aws_dynamodb_table.pwa_invites.arn,
            aws_dynamodb_table.uniq.arn,
          ] : [
            arn,
            "${arn}/index/*",
          ]
        ])
      },
      {
        Sid    = "CognitoAdminAccess"
        Effect = "Allow"
        Action = [
          "cognito-idp:InitiateAuth",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminGetUser",
        ]
        Resource = "*"
      },
    ]
  })
}

# ALB
resource "aws_lb" "this" {
  name               = "${local.unique_name}-alb"
  load_balancer_type = "application"
  internal           = false
  subnets            = local.subnet_ids
  security_groups    = [aws_security_group.alb.id]
  tags               = local.tags
}

resource "aws_lb_target_group" "app" {
  name        = "${local.unique_name}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/healthz"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  tags = local.tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECS task definition + service
resource "aws_ecs_task_definition" "app" {
  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.container_image
      essential = true
      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = var.app_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "COGNITO_USER_POOL_ID", value = aws_cognito_user_pool.this.id },
        { name = "COGNITO_CLIENT_ID", value = aws_cognito_user_pool_client.this.id },
        { name = "COGNITO_USER_POOL_REGION", value = var.aws_region },

        { name = "DDB_TABLE_ESTATES", value = aws_dynamodb_table.estates.name },
        { name = "DDB_TABLE_USERS", value = aws_dynamodb_table.users.name },
        { name = "DDB_TABLE_RESIDENTS", value = aws_dynamodb_table.residents.name },
        { name = "DDB_TABLE_CODES", value = aws_dynamodb_table.codes.name },
        { name = "DDB_TABLE_GATES", value = aws_dynamodb_table.gates.name },
        { name = "DDB_TABLE_VALIDATION_LOGS", value = aws_dynamodb_table.validation_logs.name },
        { name = "DDB_TABLE_ACTIVITY_LOGS", value = aws_dynamodb_table.activity_logs.name },
        { name = "DDB_TABLE_PWA_INVITES", value = aws_dynamodb_table.pwa_invites.name },
        { name = "DDB_TABLE_UNIQ", value = aws_dynamodb_table.uniq.name },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "app"
        }
      }
    }
  ])

  tags = local.tags
}

resource "aws_ecs_service" "app" {
  name            = "${local.unique_name}-svc"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = local.subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = var.app_port
  }

  depends_on = [aws_lb_listener.http]

  tags = local.tags
}

# CloudFront in front of ALB so you get HTTPS without a custom domain.
# We use AWS-managed cache/origin request policies for a minimal setup.

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  comment             = "${local.name} distribution"
  default_root_object = ""

  origin {
    domain_name = aws_lb.this.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.tags
}
