variable "name" {
  type        = string
  description = "Prefix for queue names"
}

variable "queues" {
  type = map(object({
    fifo                  = optional(bool, false)
    visibility_timeout    = optional(number, 60)
    message_retention     = optional(number, 345600)
    max_receive_count     = optional(number, 3)
    dlq_enabled           = optional(bool, true)
    delay_seconds         = optional(number, 0)
  }))
  description = "Queue definitions; each gets a matching DLQ when dlq_enabled"
}

locals {
  ids = { for k, v in var.queues : k => "${var.name}-${k}" }
}

resource "aws_sqs_queue" "this" {
  for_each                  = var.queues
  name                       = local.ids[each.key]
  fifo_queue                 = each.value.fifo
  visibility_timeout_seconds = each.value.visibility_timeout
  message_retention_seconds  = each.value.message_retention
  delay_seconds              = each.value.delay_seconds
  tags                       = var.tags
}

resource "aws_sqs_queue" "dlq" {
  for_each = {
    for k, v in var.queues : k => v if v.dlq_enabled
  }
  name                       = "${local.ids[each.key]}-dlq"
  fifo_queue                 = each.value.fifo
  message_retention_seconds  = 1209600
  tags                       = var.tags
}

resource "aws_sqs_queue_redrive_policy" "this" {
  for_each = {
    for k, v in var.queues : k => v if v.dlq_enabled
  }
  queue_url = aws_sqs_queue.this[each.key].id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = each.value.max_receive_count
  })
}

# CloudWatch alarms for DLQ depth visibility
resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  for_each = {
    for k, v in var.queues : k => v if v.dlq_enabled
  }
  alarm_name = "${var.name}-${each.key}-dlq-depth-alarm"
  alarm_description   = "Triggered when DLQ has visible messages (failed processing)"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions = {
    QueueName = aws_sqs_queue.dlq[each.key].name
  }
  statistic = "Sum"
  period    = 300
  evaluation_periods = 1
  threshold = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data = "missing"
  alarm_actions = []
}

# SNS topic for DLQ alarm notifications could be added here,
# but is intentionally omitted to keep this module lightweight.
# Consumers can subscribe to the CloudWatch alarm directly.

output "queue_urls" {
  value = { for k, q in aws_sqs_queue.this : k => q.id }
}

output "queue_arns" {
  value = { for k, q in aws_sqs_queue.this : k => q.arn }
}

output "dlq_urls" {
  value = { for k, q in aws_sqs_queue.dlq : k => q.id }
}

output "dlq_arns" {
  value = { for k, q in aws_sqs_queue.dlq : k => q.arn }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources"
  default     = {}
}
