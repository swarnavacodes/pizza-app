variable "name" {
  type        = string
  description = "Prefix for topic names"
}

variable "topics" {
  type = map(object({
    fifo = optional(bool, false)
  }))
  description = "SNS topic definitions"
}

locals {
  ids = { for k, v in var.topics : k => "${var.name}-${k}" }
}

resource "aws_sns_topic" "this" {
  for_each   = var.topics
  name       = local.ids[each.key]
  fifo_topic = each.value.fifo
  tags       = var.tags
}

output "topic_arns" {
  value = { for k, t in aws_sns_topic.this : k => t.arn }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources"
  default     = {}
}
