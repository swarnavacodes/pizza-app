---
name: terraform-skill
description: Use when authoring, reviewing, or applying Terraform HCL for AWS resources via LocalStack. Triggers on "terraform", "tf", "infra", "hcl", "localstack endpoint".
---

# Terraform + LocalStack Skill

## When to use
- Writing or refactoring any file under `infrastructure/`
- Provisioning AWS resources (DynamoDB, Lambda, SQS, SNS, EventBridge, API Gateway, Step Functions, Cognito, S3, IAM)
- Validating HCL (`terraform fmt`, `validate`, `tflint`, `tfsec`)
- Planning/applying against LocalStack (`http://localhost:4566`)

## Hard rules
1. **Terraform only** — no `awslocal`/`aws` CLI for resource creation; CLI is fine for read inspection.
2. Every provider block must set LocalStack endpoints for all services used.
3. `access_key = "test"`, `secret_key = "test"`, `skip_*` flags required.
4. `s3_use_path_style = true` (LocalStack S3 needs path-style).
5. Never commit `.tfstate`; gitignore it. opencode denies edits to `*.tfstate*`.
6. Secrets via `sensitive = true` variables; never literal keys in HCL.
7. Every module outputs ARNs + names for downstream consumption.
8. Run order: `fmt` → `init -upgrade` → `validate` → `tflint` → `tfsec` → `plan` → (confirm) → `apply`.

## Module template
```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "environment" { type = string }
variable "project_prefix" { type = string }
locals {
  name = "${var.project_prefix}-${var.environment}"
  common_tags = {
    Project    = "PizzaApp"
    Environment = var.environment
    ManagedBy  = "terraform"
  }
}
```

## Lambda zip pattern
```hcl
data "archive_file" "order_create" {
  type        = "zip"
  source_dir  = "${path.module}/../../packages/backend/services/order/dist"
  output_path = "${path.module}/build/order_create.zip"
}
resource "aws_lambda_function" "order_create" {
  function_name = "${local.name}-order-create"
  filename      = data.archive_file.order_create.output_path
  source_code_hash = data.archive_file.order_create.output_base64sha256
  handler       = "handlers/create.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.order_create.arn
  environment { variables = { TABLE_NAME = aws_dynamodb_table.orders.name } }
}
```

## LocalStack gotchas
- EventBridge pattern matching + archives: LocalStack **Pro**. Community: use SNS→SQS fanout.
- Step Functions: LocalStack **Pro**. Community: SQS chains + Lambda orchestration.
- Cognito hosted UI: limited; use CLI-based auth flows for dev.
- X-Ray: limited support; rely on CloudWatch Logs + structured correlation IDs.
- Use `tflocal` wrapper (`pip install terraform-local`) to auto-redirect endpoints if preferred.

## Validation commands
```bash
terraform -chdir=infrastructure/environments/dev fmt -recursive
terraform -chdir=infrastructure/environments/dev init -upgrade
terraform -chdir=infrastructure/environments/dev validate
tflint --chdir=infrastructure/environments/dev
tfsec infrastructure/
terraform -chdir=infrastructure/environments/dev plan -out=tfplan
```
