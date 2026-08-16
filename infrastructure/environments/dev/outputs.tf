output "dynamodb_tables" {
  description = "Table names and ARNs for backend env config"
  value = {
    names = module.dynamodb.table_names
    arns  = module.dynamodb.table_arns
  }
}

output "sqs_queues" {
  description = "Queue URLs and ARNs for backend env config and EventBridge targets"
  value = {
    urls = module.sqs.queue_urls
    arns = module.sqs.queue_arns
  }
}

output "sns_topics" {
  description = "Topic ARNs for notification wiring"
  value       = module.sns.topic_arns
}

output "event_bus" {
  description = "EventBridge bus name and ARN"
  value = {
    name = module.eventbridge.event_bus_name
    arn  = module.eventbridge.event_bus_arn
  }
}

output "s3_buckets" {
  description = "Bucket names for media and exports"
  value = {
    names = module.s3.bucket_names
    arns  = module.s3.bucket_arns
  }
}

output "order_api_endpoint" {
  description = "Order service HTTP API endpoint"
  value       = module.order.api_endpoint
}

output "order_functions" {
  description = "Order Lambda function names"
  value       = module.order.function_names
}
