---
name: dynamodb-skill
description: Use when designing DynamoDB tables, GSIs/LSIs, access patterns, or Terraform aws_dynamodb_table resources for the pizza app. Triggers on "dynamodb", "table design", "gsi", "lsi", "access pattern", "partition key".
---

# DynamoDB Design Skill

## When to use
- Designing any of the 7 domain tables (orders, menu, kitchen-orders, deliveries, drivers, offers, customer-offers, partner-orders)
- Writing Terraform `aws_dynamodb_table` resources
- Troubleshooting hot partitions or GSI cost
- Building Lambda query/scan code

## Design principles (pizza app)
1. **One table per bounded context** (not single-table-per-app) — keeps schemas readable for learning.
2. **Choose partition keys with high cardinality + uniform distribution**: `orderId`, `driverId`, `productId`.
3. **GSIs for access-pattern inversion** only — each GSI costs storage + WCU/RCU.
4. **No LSIs unless sort key range queries on the same partition are core** — prefer GSIs for cross-partition.
5. **TTL** on transient records (e.g., delivered orders archived after 90 days) — set `ttl_attribute`.
6. **ON_DEMAND billing** for dev (LocalStack ignores but good practice); PROVISIONED with autoscaling documented for prod.
7. **Point-in-time recovery** enabled on order/payment tables.
8. **Stream** (NEW_AND_OLD_IMAGES) on orders + deliveries → drives EventBridge or Lambda triggers (Pro feature; community: poll).

## Access pattern → Index map (orders table example)
| Query                              | Key condition                         | Index                          |
|------------------------------------|---------------------------------------|--------------------------------|
| Get order by id                    | `orderId = ?`                         | base table                     |
| List customer's recent orders      | `customerId = ? AND status = ?`      | GSI: customerId-status-index   |
| Dashboard: today's orders by date  | `status = ? AND createdAt BETWEEN ?` | GSI: status-date-index         |

## Terraform template
```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "${local.name}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"
  attribute {
    name = "orderId"
    type = "S"
  }
  attribute { name = "customerId"; type = "S" }
  attribute { name = "status";     type = "S" }
  attribute { name = "createdAt";  type = "S" }

  global_secondary_index {
    name            = "customerId-status-index"
    hash_key        = "customerId"
    range_key       = "status"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "status-date-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  point_in_time_recovery { enabled = true }
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  ttl { attribute_name = "expirableAt"; enabled = true }
  tags = local.common_tags
}
```

## Anti-patterns to flag
- `Scan` over large tables in hot paths (use GSI or Query)
- GSIs with `projection_type = "ALL"` everywhere (prefer `INCLUDE` with listed attributes)
- Hot partition from low-cardinality keys (`status` alone as PK)
- Missing DLQ / retries on stream consumers
- `cascade_delete` patterns that break audit trail
