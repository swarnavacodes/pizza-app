---
name: eventbridge-skill
description: Use when designing the event-driven backbone — EventBridge buses, rules, targets, schemas, archives/replay. Triggers on "eventbridge", "event bus", "event rule", "event catalog", "event router", "event-driven".
---

# EventBridge Skill

## When to use
- Adding a domain event to the catalog
- Writing Terraform `aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target`
- Designing the `pizza-dev-event-bus` routing
- Choosing between EventBridge vs direct SNS/SQS
- Schema registry + discovering payload shapes

## Event contract (typed, versioned)
```ts
// packages/shared/contracts/events.ts
export interface PizzaEvent<T = unknown> {
  eventId:        string;
  eventType:      PizzaEventType;
  source:         "pizza.order" | "pizza.kitchen" | "pizza.delivery" | "pizza.offer" | "pizza.payment" | "pizza.partner";
  occurredAt:     string; // ISO
  correlationId:  string; // orderId or deliveryId
  version:        "1.0";
  payload:        T;
}
```

## Routing topology
```
pizza-dev-event-bus
├── rule: order-to-kitchen        (source=pizza.order, detail-type=OrderPlaced|OrderConfirmed)
│     → target: SQS kitchen-events-queue
├── rule: kitchen-to-delivery     (source=pizza.kitchen, detail-type=KitchenReady)
│     → target: SQS delivery-events-queue
├── rule: order-to-notification   (source=pizza.order, detail-type=OrderPlaced|OrderCancelled)
│     → target: SNS customer-notifications topic
├── rule: offer-to-reporting      (source=pizza.offer, detail-type=OfferApplied)
│     → target: SQS reporting-queue
├── rule: payment-to-order       (source=pizza.payment, detail-type=PaymentSucceeded|PaymentFailed)
│     → target: SQS order-events-queue
├── rule: daily-report           (schedule: rate(1 day))
│     → target: Lambda daily-report-generator
```

## Terraform rule + target
```hcl
resource "aws_cloudwatch_event_rule" "kitchen_route" {
  event_bus_name = aws_cloudwatch_event_bus.pizza_bus.name
  name           = "${local.name}-order-to-kitchen"
  event_pattern = jsonencode({
    "source"      = ["pizza.order"]
    "detail-type" = ["OrderPlaced", "OrderConfirmed"]
  })
}
resource "aws_cloudwatch_event_target" "kitchen_sqs" {
  rule           = aws_cloudwatch_event_rule.kitchen_route.name
  event_bus_name = aws_cloudwatch_event_bus.pizza_bus.name
  target_id      = "kitchen-queue"
  arn            = aws_sqs_queue.kitchen_events.arn
  sqs_message = jsonencode({ ... }) // optional transformer
}
```

## Archive + replay (Pro; community fallback = S3 archive Lambda)
```hcl
resource "aws_cloudwatch_event_archive" "pizza_archive" {
  name             = "${local.name}-archive"
  event_source_arn = aws_cloudwatch_event_bus.pizza_bus.arn
  retention_days   = 30
}
```
Community fallback: Lambda on EventBridge → write events to S3 prefix `events/yyyy/mm/dd/`; replay via Lambda scan + replay API. Document in module README.

## Design choices
- Prefer EventBridge when you need **content-based routing** or **multiple targets**.
- Use SNS→SQS for simple fan-out where rule patterns add overhead.
- Avoid cross-bus put-events in hot path — batch via SQS → Lambda → putEvents.
- Dead-letter target on every rule (`aws_cloudwatch_event_target.dead_letter_config`).

## Anti-patterns to flag
- Putting raw entities as events (always wrap in `PizzaEvent` envelope)
- Schema drift without version bump
- Rules with `source: [*]` (catch-all) in production
- No correlationId → breaks X-Ray/tracing continuity
