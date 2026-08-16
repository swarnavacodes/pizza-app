---
name: lambda-skill
description: Use when writing AWS Lambda handlers in TypeScript for the pizza app. Triggers on "lambda", "handler", "nodejs20", "powertools", "lambda packaging".
---

# AWS Lambda (TypeScript) Skill

## When to use
- Writing any handler under `packages/backend/services/<service>/handlers/`
- Packaging/zip build config
- Injecting env vars from Terraform outputs
- Wiring EventBridge/SQS/SNS/DynamoDB stream triggers
- Using Powertools for logging/metrics/tracing

## Handler structure
```ts
// handlers/create.ts
import { z } from "zod";
import { logger, tracer, metrics } from "@/shared/powertools";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { OrderRepository } from "@order/repository";
import { emitEvent } from "@order/events";

const CreateOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    quantity:  z.number().int().positive(),
    customizations: z.object({
      size: z.string(), crust: z.string(), toppings: z.array(z.string())
    }).partial()
  })).min(1),
  deliveryAddress: z.object({ street: z.string(), city: z.string(), zip: z.string() }),
  offerCode: z.string().optional(),
  idempotencyKey: z.string().uuid()
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  tracer.annotateColdStart();
  const body = CreateOrderSchema.parse(JSON.parse(event.body ?? "{}"));
  const order = await OrderRepository.create(body);
  await emitEvent("OrderPlaced", { orderId: order.orderId });
  return { statusCode: 201, body: JSON.stringify(order) };
};
```

## Must-haves
1. **Zod validation** on every entry — API body, SQS message, stream record.
2. **Idempotency key** for create/apply/payment flows (store in DynamoDB as idempotency record with TTL).
3. **Powertools** (`@aws-lambda-powertools/logger/metrics/tracer`): Middy-free; structured logs with correlationId.
4. **No `any`**: handler return types explicit; payloads typed from `@shared/contracts`.
5. **Cold start hygiene**: imports outside handler; lazy init clients; use `tracer.annotateColdStart()`.
6. **Error contract**: throw `HttpError` (4xx) or `AppError` (5xx → SQS retry → DLQ after max retries).
7. **No console.log**: use `logger.info/warn/debug/error`.
8. **Build**: `esbuild` → ESM bundle → `data.archive_file` in Terraform.

## Event source adapters ( Powertools parser pattern )
```ts
import { EventBridgeSchema } from "@shared/contracts/events";
// SQS batch
for (const record of event.Records) {
  const evt = EventBridgeSchema.parse(JSON.parse(record.body));
  await processEvent(evt);
}
```

## Terraform wiring reminder
- env var `TABLE_NAME`, `QUEUE_URL`, `EVENT_BUS_NAME`, `LOG_LEVEL` injected from Terraform outputs
- DLQ configured; `reserved_concurrent_executions` set per service to prevent fan-out storms
- `logging_config` → CloudWatch log group with retention

## Anti-patterns to flag
- Async work after response sent (will be killed by Lambda freeze) → use SQS instead
- `await Promise.all` on unbounded arrays → batch + DLQ
- Reading `process.env` without defaults inside handler (fail fast at cold start)
- Shared mutable state between invocations (container reuse)
