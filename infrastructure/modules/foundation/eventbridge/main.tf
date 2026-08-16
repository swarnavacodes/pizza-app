variable "name" {
  type        = string
  description = "Prefix for the event bus name"
}

variable "archive_enabled" {
  type        = bool
  description = "Enable EventBridge archive (LocalStack Pro only)"
  default     = false
}

variable "archive_retention_days" {
  type        = number
  default     = 30
}

variable "rules" {
  type = map(object({
    event_pattern = string
    targets = list(object({
      arn              = string
      target_id        = string
      sqs_message_group_id = optional(string)
      dlq_arn          = optional(string)
    }))
  }))
  default     = {}
  description = "Event rules with SNS/SQS/Lambda targets"
}

resource "aws_cloudwatch_event_bus" "this" {
  name = var.name
  tags = var.tags
}

resource "aws_cloudwatch_event_archive" "this" {
  count             = var.archive_enabled ? 1 : 0
  name              = "${var.name}-archive"
  event_source_arn  = aws_cloudwatch_event_bus.this.arn
  retention_days    = var.archive_retention_days
}

resource "aws_cloudwatch_event_rule" "this" {
  for_each      = var.rules
  name          = "${var.name}-${each.key}"
  event_bus_name = aws_cloudwatch_event_bus.this.name
  event_pattern = each.value.event_pattern
}

resource "aws_cloudwatch_event_target" "this" {
  for_each = {
    for rule_key, rule in var.rules : rule_key => rule
  }
  rule           = aws_cloudwatch_event_rule.this[each.key].name
  event_bus_name = aws_cloudwatch_event_bus.this.name
  target_id      = try(each.value.targets[0].target_id, "default")
  arn            = each.value.targets[0].arn

  dynamic "dead_letter_config" {
    for_each = each.value.targets[0].dlq_arn != null ? [each.value.targets[0].dlq_arn] : []
    content {
      arn = dead_letter_config.value
    }
  }
}

output "event_bus_arn" {
  value = aws_cloudwatch_event_bus.this.arn
}

output "event_bus_name" {
  value = aws_cloudwatch_event_bus.this.name
}

output "rule_names" {
  value = { for k, r in aws_cloudwatch_event_rule.this : k => r.name }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources"
  default     = {}
}
