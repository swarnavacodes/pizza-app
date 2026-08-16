variable "name" {
  type        = string
  description = "Prefix for table names"
}

variable "tables" {
  type = map(object({
    hash_key      = string
    sort_key      = optional(string)
    billing_mode  = optional(string, "PAY_PER_REQUEST")
    attributes    = map(string)
    gsis          = optional(map(object({
      hash_key        = string
      range_key       = optional(string)
      projection_type = optional(string, "ALL")
      non_key_attrs   = optional(list(string))
    })), {})
    ttl_attribute        = optional(string)
    ttl_enabled          = optional(bool, false)
    point_in_time_recovery = optional(bool, false)
    stream_enabled       = optional(bool, false)
    stream_view_type     = optional(string)
  }))
  description = "Table definitions"
}

locals {
  resource_ids = { for k, v in var.tables : k => "${var.name}-${k}" }
}

resource "aws_dynamodb_table" "this" {
  for_each     = var.tables
  name         = local.resource_ids[each.key]
  billing_mode = each.value.billing_mode
  hash_key     = each.value.hash_key
  range_key    = each.value.sort_key

  dynamic "attribute" {
    for_each = each.value.attributes
    content {
      name = attribute.key
      type = attribute.value
    }
  }

  dynamic "global_secondary_index" {
    for_each = each.value.gsis
    content {
      name               = global_secondary_index.key
      hash_key           = global_secondary_index.value.hash_key
      range_key          = global_secondary_index.value.range_key
      projection_type    = global_secondary_index.value.projection_type
      non_key_attributes = global_secondary_index.value.non_key_attrs
    }
  }

  dynamic "ttl" {
    for_each = each.value.ttl_enabled ? [each.value.ttl_attribute] : []
    content {
      attribute_name = ttl.value
      enabled        = true
    }
  }

  dynamic "point_in_time_recovery" {
    for_each = each.value.point_in_time_recovery ? [true] : []
    content {
      enabled = true
    }
  }

  stream_enabled   = each.value.stream_enabled
  stream_view_type = each.value.stream_view_type

  tags = var.tags
}

output "table_names" {
  value = { for k, t in aws_dynamodb_table.this : k => t.name }
}

output "table_arns" {
  value = { for k, t in aws_dynamodb_table.this : k => t.arn }
}

output "table_stream_arns" {
  value = { for k, t in aws_dynamodb_table.this : k => t.stream_arn }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources"
  default     = {}
}
