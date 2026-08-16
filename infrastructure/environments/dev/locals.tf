locals {
  name = "${var.project_prefix}-${var.environment}"

  common_tags = merge(var.tags, {
    Environment = var.environment
  })
}
