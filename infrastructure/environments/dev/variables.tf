variable "project_prefix" {
  type        = string
  description = "Short project prefix used in resource names"
  default     = "pizza"
}

variable "environment" {
  type        = string
  description = "Environment name (dev/prod)"
  default     = "dev"
}

variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
  default = {
    Project   = "PizzaApp"
    ManagedBy = "terraform"
    CreatedBy = "opencode-agents"
  }
}
