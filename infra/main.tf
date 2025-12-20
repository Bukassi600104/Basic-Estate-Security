resource "random_id" "name_suffix" {
  byte_length = 2
}

locals {
  name        = var.project_name
  unique_name = "${var.project_name}-${random_id.name_suffix.hex}"
  tags = {
    Project = var.project_name
  }

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

# Security group for RDS MySQL
resource "aws_security_group" "rds" {
  name        = "${local.unique_name}-rds-sg"
  description = "RDS MySQL security group"
  vpc_id      = local.vpc_id

  ingress {
    description     = "MySQL from ECS tasks"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.unique_name}-rds-sg" })
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

data "aws_secretsmanager_secret" "app_secrets" {
  name = var.app_secrets_name
}

data "aws_iam_policy_document" "ecs_task_exec_secrets" {
  statement {
    actions = [
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
    ]

    resources = [data.aws_secretsmanager_secret.app_secrets.arn]
  }
}

resource "aws_iam_role_policy" "ecs_task_exec_secrets" {
  name   = "${local.name}-ecs-task-exec-secrets"
  role   = aws_iam_role.ecs_task_execution.id
  policy = data.aws_iam_policy_document.ecs_task_exec_secrets.json
}

# RDS password: allow auto-generation if not provided
resource "random_password" "db" {
  length  = 24
  # RDS forbids some characters (e.g. '/', '@', '"', space). Keep it simple.
  special = false
}

locals {
  effective_db_password = var.db_password != "" ? var.db_password : random_password.db.result
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.unique_name}-db-subnets"
  subnet_ids = local.subnet_ids
  tags       = local.tags
}

resource "aws_db_instance" "mysql" {
  identifier             = "${local.unique_name}-mysql"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  db_name                = var.db_name
  username               = var.db_username
  password               = local.effective_db_password
  port                   = 3306
  multi_az               = false
  storage_encrypted      = true
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  tags = local.tags
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
        {
          name  = "DATABASE_URL",
          value = "mysql://${var.db_username}:${local.effective_db_password}@${aws_db_instance.mysql.address}:${aws_db_instance.mysql.port}/${var.db_name}"
        }
      ]

      secrets = [
        {
          name      = "AUTH_JWT_SECRET",
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:AUTH_JWT_SECRET::"
        },
        {
          name      = "TELEGRAM_BOT_TOKEN",
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:TELEGRAM_BOT_TOKEN::"
        },
        {
          name      = "TELEGRAM_WEBHOOK_SECRET",
          valueFrom = "${data.aws_secretsmanager_secret.app_secrets.arn}:TELEGRAM_WEBHOOK_SECRET::"
        }
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
