module "dynamodb" {
  source = "../../modules/foundation/dynamodb"
  name   = local.name
  tags   = local.common_tags

  tables = {
    orders = {
      hash_key   = "orderId"
      attributes = { orderId = "S", customerId = "S", status = "S", createdAt = "S" }
      gsis = {
        "customerId-status-index" = { hash_key = "customerId", range_key = "status" }
        "status-date-index"       = { hash_key = "status", range_key = "createdAt" }
      }
      ttl_attribute          = "expirableAt"
      ttl_enabled            = true
      point_in_time_recovery = true
      stream_enabled         = true
      stream_view_type       = "NEW_AND_OLD_IMAGES"
    }
    menu = {
      hash_key   = "productId"
      attributes = { productId = "S", category = "S" }
      gsis = {
        "category-index" = { hash_key = "category" }
      }
    }
    "kitchen-orders" = {
      hash_key   = "kitchenOrderId"
      attributes = { kitchenOrderId = "S", orderId = "S", stationId = "S", status = "S" }
      gsis = {
        "orderId-index"        = { hash_key = "orderId" }
        "station-status-index" = { hash_key = "stationId", range_key = "status" }
      }
      stream_enabled   = true
      stream_view_type = "NEW_AND_OLD_IMAGES"
    }
    deliveries = {
      hash_key   = "deliveryId"
      attributes = { deliveryId = "S", orderId = "S", driverId = "S", status = "S" }
      gsis = {
        "orderId-index"         = { hash_key = "orderId" }
        "driverId-status-index" = { hash_key = "driverId", range_key = "status" }
      }
    }
    drivers = {
      hash_key   = "driverId"
      attributes = { driverId = "S", status = "S" }
      gsis = {
        "status-index" = { hash_key = "status" }
      }
    }
    offers = {
      hash_key   = "offerId"
      attributes = { offerId = "S", code = "S", status = "S", validUntil = "S" }
      gsis = {
        "code-index"              = { hash_key = "code" }
        "status-validUntil-index" = { hash_key = "status", range_key = "validUntil" }
      }
    }
    "customer-offers" = {
      hash_key   = "customerOfferId"
      attributes = { customerOfferId = "S", customerId = "S" }
      gsis = {
        "customerId-index" = { hash_key = "customerId" }
      }
    }
    "partner-orders" = {
      hash_key   = "partnerOrderId"
      attributes = { partnerOrderId = "S", partnerId = "S", status = "S" }
      gsis = {
        "partnerId-status-index" = { hash_key = "partnerId", range_key = "status" }
      }
    }
    idempotency = {
      hash_key      = "idempotencyKey"
      attributes    = { idempotencyKey = "S" }
      ttl_attribute = "expirableAt"
      ttl_enabled   = true
    }
  }
}

module "sqs" {
  source = "../../modules/foundation/sqs"
  name   = local.name
  tags   = local.common_tags

  queues = {
    "order-events" = {
      visibility_timeout = 60
      max_receive_count  = 5
    }
    "kitchen-events" = {
      visibility_timeout = 300
      max_receive_count  = 3
    }
    "delivery-events" = {
      visibility_timeout = 120
      max_receive_count  = 3
    }
    "payment-events" = {
      visibility_timeout = 60
      max_receive_count  = 5
    }
    "partner-webhooks" = {
      visibility_timeout = 60
      max_receive_count  = 3
    }
  }
}

module "sns" {
  source = "../../modules/foundation/sns"
  name   = local.name
  tags   = local.common_tags

  topics = {
    "customer-notifications" = {}
    "partner-webhooks"       = {}
  }
}

module "eventbridge" {
  source = "../../modules/foundation/eventbridge"
  name   = "${local.name}-event-bus"
  tags   = local.common_tags

  archive_enabled = false
  rules           = {}
}

module "s3" {
  source = "../../modules/foundation/s3"
  name   = local.name
  tags   = local.common_tags

  buckets = {
    media   = {}
    exports = {}
  }
}

module "order" {
  source = "../../modules/order"
  name   = local.name
  tags   = local.common_tags

  orders_table_arn       = module.dynamodb.table_arns["orders"]
  orders_table_name      = module.dynamodb.table_names["orders"]
  idempotency_table_arn  = module.dynamodb.table_arns["idempotency"]
  idempotency_table_name = module.dynamodb.table_names["idempotency"]
  event_bus_arn          = module.eventbridge.event_bus_arn
  event_bus_name         = module.eventbridge.event_bus_name
  allowed_origins        = ["http://localhost:3000"]
}

module "kitchen" {
  source = "../../modules/kitchen"
  name   = local.name
  tags   = local.common_tags

  kitchen_orders_table_arn = module.dynamodb.table_arns["kitchen-orders"]
  kitchen_orders_table_name = module.dynamodb.table_names["kitchen-orders"]
  event_bus_arn            = module.eventbridge.event_bus_arn
  event_bus_name           = module.eventbridge.event_bus_name
  kitchen_events_queue_url = module.sqs.queue_urls["kitchen-events"]
  environment              = "dev"
  lambda_endpoint_url      = "http://floci:4566"
}
