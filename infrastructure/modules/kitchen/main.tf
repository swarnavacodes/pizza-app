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

variable "kitchen_orders_table_arn" {
  type        = string
  description = "ARN of the kitchen-orders DynamoDB table"
}

variable "kitchen_orders_table_name" {
  type        = string
  description = "Name of the kitchen-orders DynamoDB table"
}

variable "event_bus_arn" {
  type        = string
  description = "ARN of the EventBridge bus"
}

variable "event_bus_name" {
  type        = string
  description = "Name of the EventBridge bus"
}

variable "kitchen_events_queue_url" {
  type        = string
  description = "URL of the kitchen-events SQS queue (consumer target)"
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
    process = "process"
  }
}

data "archive_file" "handler" {
  for_each    = local.handlers
  type        = "zip"
  source_file = "${path.module}/../../../packages/backend/services/kitchen/dist/handlers/${each.key}.js"
  output_path = "${path.module}/build/${each.key}.zip"
}

resource "aws_iam_role" "kitchen" {
  name = "${var.name}-kitchen-lambda"
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

resource "aws_iam_role_policy" "kitchen" {
  name = "${var.name}-kitchen-lambda-policy"
  role = aws_iam_role.kitchen.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:TransactWriteItems"
        ]
        Resource = [var.kitchen_orders_table_arn]
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
          "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name}-kitchen-*:*"
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "kitchen" {
  for_each      = local.handlers
  function_name = "${var.name}-kitchen-${each.key}"
  filename      = data.archive_file.handler[each.key].output_path
  source_code_hash = data.archive_file.handler[each.key].output_base64sha256
  handler       = "${each.key}.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.kitchen.arn
  timeout       = 30
  memory_size   = 256
  environment {
    variables = {
      KITCHEN_ORDERS_TABLE        = var.kitchen_orders_table_name
      EVENT_BUS_NAME              = var.event_bus_name
      KITCHEN_EVENTS_QUEUE_URL    = var.kitchen_events_queue_url
      POWERTOOLS_SERVICE_NAME     = "kitchen"
      LOG_LEVEL                   = "INFO"
      AWS_ENDPOINT_URL            = var.lambda_endpoint_url
      AWS_DEFAULT_REGION          = "us-east-1"
      # Credentials injected only for dev (Floci emulator); in prod the Lambda
      # execution role provides credentials automatically.
      AWS_ACCESS_KEY_ID           = var.environment == "dev" ? "test" : null
      AWS_SECRET_ACCESS_KEY       = var.environment == "dev" ? "test" : null
    }
  }
  # Active X-Ray tracing for distributed tracing across services
  tracing_config {
    mode = "Active"
  }
  # Prevent a single service from consuming all Lambda concurrency
  reserved_concurrent_executions = 100
  tags = var.tags
}

# EventBridge rule: Route OrderPlaced events from the order service
# to the kitchen-events SQS queue so the Kitchen service can create tickets.
resource "aws_cloudwatch_event_rule" "order_placed" {
  name                = "${var.name}-order-placed-rule"
  event_bus_name      = var.event_bus_name
  description         = "Route OrderPlaced events to kitchen SQS queue"
  event_pattern = jsonencode({
    source      = ["pizza.order"]
    detail-type = ["OrderPlaced"]
  })
}

# Target: Push OrderPlaced events into the kitchen-events SQS queue
resource "aws_cloudwatch_event_target" "kitchen_sqs" {
  rule = aws_cloudwatch_event_rule.order_placed.name
  arn  = var.kitchen_events_queue_url
}

# Grant the EventBridge service principal permission to publish to the SQS queue
# (SQS allows EventBridge as a publisher via this resource-based policy)
resource "aws_sqs_queue_policy" "kitchen_events" {
  queue_url = aws_sqs_queue.kitchen_events.id
  policy   = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "events.amazonaws.com" }
        Action    = "SQS.SendMessage"
        Resource  = aws_sqs_queue.kitchen_events.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = var.event_bus_arn
          }
        }
      }
    ]
  })
}

# The kitchen-events SQS queue (shared with the foundation module;
# referenced by URL for the Lambda consumer target)
# NOTE: In a full setup, this would reference the foundation module's
# pizza-dev-kitchen-events queue. For standalone Terraform apply, the
# queue must exist already or be created as a dependency.
resource "aws_sqs_queue" "kitchen_events" {
  name                       = "${var.name}-kitchen-events"
  fifo_queue                 = false
  visibility_timeout_seconds = 300
  message_retention_seconds  = 345600
  tags                       = var.tags
}

output "function_names" {
  value = { for k, f in aws_lambda_function.kitchen : k => f.function_name }
}

output "event_rule_arn" {
  value = aws_cloudwatch_event_rule.order_placed.arn
}