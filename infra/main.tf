locals {
  name = var.project_name
  tags = {
    Project = var.project_name
  }

  # Use stable names so data survives redeploys (unless you intentionally destroy).
  ddb_table_estates         = "${var.project_name}_Estates"
  ddb_table_users           = "${var.project_name}_Users"
  ddb_table_residents       = "${var.project_name}_Residents"
  ddb_table_codes           = "${var.project_name}_Codes"
  ddb_table_gates           = "${var.project_name}_Gates"
  ddb_table_validation_logs = "${var.project_name}_ValidationLogs"
  ddb_table_activity_logs   = "${var.project_name}_ActivityLogs"
  ddb_table_pwa_invites     = "${var.project_name}_PwaInvites"
  ddb_table_uniq            = "${var.project_name}_Uniq"
  ddb_table_rate_limits     = "${var.project_name}_RateLimits"
}

# Cognito (auth)
resource "aws_cognito_user_pool" "this" {
  name = "${local.name}-user-pool"

  # Allow users to enroll in MFA (TOTP). We'll enforce it for privileged users
  # at the app layer (middleware) by requiring a custom attribute flag.
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

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

  schema {
    name                = "mfaEnabled"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 8
    }
  }

  tags = local.tags
}

resource "aws_cognito_user_pool_client" "this" {
  name         = "${local.name}-app-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  # Required for InitiateAuth USER_PASSWORD_AUTH used by the app.
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
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

resource "aws_dynamodb_table" "rate_limits" {
  name         = local.ddb_table_rate_limits
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "rateLimitKey"

  attribute {
    name = "rateLimitKey"
    type = "S"
  }

  # DynamoDB TTL expects epoch seconds (Number).
  ttl {
    attribute_name = "ttlEpochSeconds"
    enabled        = true
  }

  tags = local.tags
}

# IAM policy you can attach to Amplify's SSR execution role.
# This is required so server-side routes can read/write DynamoDB and perform Cognito Admin APIs.
data "aws_iam_policy_document" "amplify_ssr_access" {
  statement {
    sid    = "DynamoDbAccess"
    effect = "Allow"
    actions = [
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
    resources = [
      aws_dynamodb_table.estates.arn,
      "${aws_dynamodb_table.estates.arn}/index/*",
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*",
      aws_dynamodb_table.residents.arn,
      "${aws_dynamodb_table.residents.arn}/index/*",
      aws_dynamodb_table.codes.arn,
      "${aws_dynamodb_table.codes.arn}/index/*",
      aws_dynamodb_table.gates.arn,
      "${aws_dynamodb_table.gates.arn}/index/*",
      aws_dynamodb_table.validation_logs.arn,
      "${aws_dynamodb_table.validation_logs.arn}/index/*",
      aws_dynamodb_table.activity_logs.arn,
      "${aws_dynamodb_table.activity_logs.arn}/index/*",
      aws_dynamodb_table.pwa_invites.arn,
      "${aws_dynamodb_table.pwa_invites.arn}/index/*",
      aws_dynamodb_table.uniq.arn,
      "${aws_dynamodb_table.uniq.arn}/index/*",
      aws_dynamodb_table.rate_limits.arn,
      "${aws_dynamodb_table.rate_limits.arn}/index/*",
    ]
  }

  statement {
    sid    = "CognitoAdminAccess"
    effect = "Allow"
    actions = [
      "cognito-idp:InitiateAuth",
      "cognito-idp:RespondToAuthChallenge",
      "cognito-idp:AssociateSoftwareToken",
      "cognito-idp:VerifySoftwareToken",
      "cognito-idp:SetUserMFAPreference",
      "cognito-idp:GetUser",
      "cognito-idp:UpdateUserAttributes",
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminSetUserPassword",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminDeleteUser",
    ]
    resources = [aws_cognito_user_pool.this.arn]
  }
}

resource "aws_iam_policy" "amplify_ssr_access" {
  name        = "${local.name}-amplify-ssr-access"
  description = "Permissions for Amplify SSR to access DynamoDB + Cognito admin APIs"
  policy      = data.aws_iam_policy_document.amplify_ssr_access.json
  tags        = local.tags
}
