variable "name" {
  type        = string
  description = "Resource name prefix"
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

variable "tags" {
  type        = map(string)
  default     = {}
}

variable "allowed_origins" {
  type        = list(string)
  description = "Allowed CORS origins for the API Gateway; defaults to '*' for dev"
  default     = ["*"]
}

variable "orders_table_arn" {
  type        = string
}

variable "orders_table_name" {
  type        = string
}

variable "idempotency_table_arn" {
  type        = string
}

variable "idempotency_table_name" {
  type        = string
}

variable "event_bus_arn" {
  type        = string
}

variable "event_bus_name" {
  type        = string
}

variable "environment" {
  type        = string
  description = "Deployment environment: dev or prod"
  default     = "dev"
}

variable "lambda_endpoint_url" {
  type        = string
  description = "AWS endpoint URL injected into Lambda env so handlers talk to the local emulator from spawned containers"
  default     = "http://floci:4566"
}

locals {
  handlers = {
    create = "create"
    get    = "get"
  }
  # Credentials are only injected for the Floci dev environment; in production
  # the Lambda execution role provides credentials automatically.
  dev_credentials = {
    AWS_ACCESS_KEY_ID     = "test"
    AWS_SECRET_ACCESS_KEY = "test"
  }
  production_credentials = {}
}

data "archive_file" "handler" {
  for_each    = local.handlers
  type        = "zip"
  source_file = "${path.module}/../../../packages/backend/services/order/dist/handlers/${each.value}.js"
  output_path = "${path.module}/build/${each.value}.zip"
}

resource "aws_iam_role" "order" {
  name = "${var.name}-order-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_iam_role_policy" "order" {
  name = "${var.name}-order-lambda-policy"
  role = aws_iam_role.order.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:TransactWriteItems"]
        Resource = [var.orders_table_arn, var.idempotency_table_arn]
      },
      {
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = [var.event_bus_arn]
      },
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
        "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name}-order-*:*"
      ]
      }
    ]
  })
}

resource "aws_lambda_function" "order" {
  for_each      = local.handlers
  function_name = "${var.name}-order-${each.value}"
  filename      = data.archive_file.handler[each.key].output_path
  source_code_hash = data.archive_file.handler[each.key].output_base64sha256
  handler       = "${each.value}.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.order.arn
  timeout       = 30
  memory_size   = 256
  environment {
    variables = {
      ORDERS_TABLE                = var.orders_table_name
      IDEMPOTENCY_TABLE           = var.idempotency_table_name
      EVENT_BUS_NAME              = var.event_bus_name
      POWERTOOLS_SERVICE_NAME     = "order"
      LOG_LEVEL                   = "INFO"
      AWS_ENDPOINT_URL            = var.lambda_endpoint_url
      AWS_DEFAULT_REGION          = "us-east-1"
      # Credentials injected only for dev (Floci emulator); in prod the Lambda
      # execution role provides credentials automatically.
      AWS_ACCESS_KEY_ID           = var.environment == "dev" ? "test" : null
      AWS_SECRET_ACCESS_KEY       = var.environment == "dev" ? "test" : null
    }
  }
  tags = var.tags
}

resource "aws_apigatewayv2_api" "order" {
  name          = "${var.name}-order-api"
  protocol_type = "HTTP"
  description   = "Order service API"
  tags          = var.tags
  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization", "x-idempotency-key"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_integration" "order" {
  for_each           = local.handlers
  api_id             = aws_apigatewayv2_api.order.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.order[each.key].invoke_arn
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "create_order" {
  api_id    = aws_apigatewayv2_api.order.id
  route_key = "POST /orders"
  target    = "integrations/${aws_apigatewayv2_integration.order["create"].id}"
}

resource "aws_apigatewayv2_route" "get_order" {
  api_id    = aws_apigatewayv2_api.order.id
  route_key = "GET /orders/{orderId}"
  target    = "integrations/${aws_apigatewayv2_integration.order["get"].id}"
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.order.api_endpoint
}

output "function_names" {
  value = { for k, f in aws_lambda_function.order : k => f.function_name }
}
