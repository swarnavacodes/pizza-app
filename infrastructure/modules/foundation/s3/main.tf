variable "name" {
  type        = string
  description = "Prefix for bucket names"
}

variable "buckets" {
  type = map(object({
    versioning = optional(bool, false)
    public_read = optional(bool, false)
  }))
  description = "S3 bucket definitions"
}

locals {
  ids = { for k, v in var.buckets : k => "${var.name}-${k}" }
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = local.ids[each.key]
  force_destroy = true
  tags     = var.tags
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = var.buckets
  bucket   = aws_s3_bucket.this[each.key].id
  versioning_configuration {
    status = each.value.versioning ? "Enabled" : "Suspended"
  }
}

output "bucket_names" {
  value = { for k, b in aws_s3_bucket.this : k => b.bucket }
}

output "bucket_arns" {
  value = { for k, b in aws_s3_bucket.this : k => b.arn }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to all resources"
  default     = {}
}
