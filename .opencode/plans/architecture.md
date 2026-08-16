# Pizza Management System — Architecture & Implementation Plan

## Executive Summary

A distributed serverless pizza management system built on AWS (simulated via **LocalStack**) using **Terraform** as the sole Infrastructure-as-Code tool. Demonstrates end-to-end agentic development covering order placement, kitchen operations, delivery management, partner coordination, reporting, and promotional offers.

---

## 1. System Architecture

### 1.1 High-Level Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│  Customer App   │   Kitchen App   │  Delivery App   │   Admin Portal      │
│   (Next.js)     │   (Next.js)     │  (Next.js)      │   (Next.js)         │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬──────────┘
         │                 │                 │                   │
         ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (HTTP API) / AppSync                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │                 │                 │                   │
         ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVERLESS FUNCTIONS (AWS Lambda)                       │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│  Order Service  │ Kitchen Service │ Delivery Service │  Admin Service      │
│  Offer Service  │ Payment Service │ Partner Service  │  Reporting Service  │
│  Notification   │ Auth Service    │ Webhook Service  │                     │
└────────┬────────┴────────┬────────┴────────┬────────┴──────────┬──────────┘
         │                 │                 │                   │
         ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                        │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│   DynamoDB      │   S3 Bucket    │    SQS Queues   │   ElastiCache       │
│  (hot data)     │ (media/assets)│ (event buffer)  │  (Redis cache)      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
         │                 │                 │                   │
         ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN LAYER                                      │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│  EventBridge    │    SNS Topics   │  Step Functions │   CloudWatch         │
│ (Event Router)  │ (Notifications) │  (Workflows)    │  (Monitoring)       │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘
```

### 1.2 Request Flow (Order Lifecycle)
```
Customer places order (Customer App)
      │  POST /orders (API Gateway → Lambda: Order Create)
      ▼
Order persisted in DynamoDB → ORDER_PLACED event on EventBridge
      │
      ├─→ SNS → Customer: "Order confirmed" email (SES)
      ├─→ SQS → Kitchen Service Lambda → creates KitchenOrder
      └─→ Step Function: orchestrates order state machine
                      │
                      ▼
Kitchen App polls/websocket → KitchenOrder QUEUED → IN_PROGRESS → READY
      │  Order READY event on EventBridge
      ▼
Delivery Service Lambda → assigns driver (internal or partner API)
      │  DELIVERY_ASSIGNED event
      ▼
Delivery App → picks up → IN_TRANSIT → DELIVERED
      │
      ▼
DELIVERED event → Reporting Lambda (aggregates metrics) → SNS push to customer
```

---

## 2. Tech Stack

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| Frontend         | Next.js 14 (App Router), Tailwind, shadcn/ui, Zustand |
| Backend runtime  | Node.js 20+ on AWS Lambda (TypeScript)           |
| API              | HTTP API (API Gateway v2) + WebSocket for realtime |
| IaC              | **Terraform** (HCL) targeting LocalStack          |
| Local AWS        | LocalStack (Pro features documented; community fallbacks noted) |
| Database         | DynamoDB (single-table design per domain)       |
| Cache            | ElastiCache (Redis)                              |
| Messaging       | SQS, SNS, EventBridge                            |
| Orchestration   | Step Functions                                   |
| Auth            | Cognito User Pools                               |
| Observability    | CloudWatch Logs/Metrics + X-Ray                  |
| Testing          | Vitest (unit/integration), Playwright (E2E)      |
| Linting          | ESLint, Prettier, tflint, tfsec                  |

---

## 3. Infrastructure — Terraform Layout

```
infrastructure/
├── versions.tf              # required_providers { aws, archive, random, null }
├── backend.tf               # local backend (dev); S3+DynamoDB locking (prod)
├── providers.tf            # aws provider with endpoints指向 LocalStack
├── variables.tf            # region, project_prefix, environment
├── locals.tf               # naming: ${var.project_prefix}-${var.environment}
├── modules/
│   ├── foundation/
│   │   ├── iam/            # shared roles + per-service policies
│   │   ├── dynamodb/      # 7 domain tables + GSIs
│   │   ├── s3/            # media bucket, logs bucket
│   │   ├── sqs/           # order, kitchen, delivery, offer, reporting queues (+ DLQs)
│   │   ├── sns/           # customer-notifications, partner-webhooks topics
│   │   └── eventbridge/   # pizza-event-bus + rules per domain
│   ├── order/
│   │   ├── lambda/        # createOrder, getOrder, cancelOrder, trackOrder
│   │   ├── api_gateway/   # /orders routes + integrations
│   │   └── step_function/ # order-state-machine.asl.json
│   ├── kitchen/
│   ├── delivery/
│   ├── offer/
│   ├── payment/
│   └── reporting/
└── environments/
    ├── dev/               # LocalStack tfvars
    │   ├── main.tf       # module instantiations
    │   ├── terraform.tfvars
    │   └── outputs.tf
    └── prod/              # real AWS (documented, not applied)
```

### 3.1 LocalStack Provider Config (providers.tf)
```hcl
provider "aws" {
  region                      = var.region
  access_key                  = "test"
  secret_key                  = "test"
  s3_use_path_style           = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    apigateway     = "http://localhost:4566"
    apigatewayv2    = "http://localhost:4566"
    dynamodb       = "http://localhost:4566"
    lambda         = "http://localhost:4566"
    sqs            = "http://localhost:4566"
    sns            = "http://localhost:4566"
    events         = "http://localhost:4566"
    stepfunctions  = "http://localhost:4566"
    s3             = "http://localhost:4566"
    iam            = "http://localhost:4566"
    cloudwatch     = "http://localhost:4566"
    cognitoidp     = "http://localhost:4566"
    elasticache    = "http://localhost:4566"
    ses            = "http://localhost:4566"
    sts            = "http://localhost:4566"
  }
}
```

### 3.2 Naming Convention
- Resources: `pizza-dev-{service}-{resource}` (e.g. `pizza-dev-order-table`)
- Tags: `Project=PizzaApp`, `Environment=dev`, `Service=order`, `ManagedBy=terraform`

### 3.3 GitHub Actions / Local CI
```
.github/workflows/infra-validate.yml
  → terraform fmt -check
  → terraform init
  → terraform validate
  → tflint
  → tfsec
  → terraform plan (against LocalStack container in CI)
```

---

## 4. Domain Model & DynamoDB Design

### 4.1 Tables (one per bounded context)

| Table (dev name)                | Partition Key       | Sort Key        | GSIs                                     |
|---------------------------------|---------------------|-----------------|------------------------------------------|
| pizza-dev-orders               | orderId (UUID)      | -               | customerId-status-index, status-date-index |
| pizza-dev-menu                 | productId           | -               | category-index                           |
| pizza-dev-kitchen-orders       | kitchenOrderId      | -               | orderId-index, station-status-index       |
| pizza-dev-deliveries           | deliveryId          | -               | orderId-index, driverId-status-index      |
| pizza-dev-drivers              | driverId            | -               | status-index                             |
| pizza-dev-offers               | offerId             | -               | code-index, status-validUntil-index       |
| pizza-dev-customer-offers      | customerOfferId     | -               | customerId-index                          |
| pizza-dev-partner-orders       | partnerOrderId      | -               | partnerId-status-index                    |

### 4.2 Entity Schemas

```typescript
// Order
{
  orderId:        "ord_abc123",
  customerId:     "cus_xyz",
  status:         "PENDING" | "CONFIRMED" | "PREPARING" | "READY"
                 | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED",
  items:          OrderItem[],
  totalAmount:    42.50,
  discountAmount: 5.00,
  deliveryAddress:{ street, city, zip, lat, lng },
  paymentStatus:  "PENDING" | "PAID" | "REFUNDED",
  offerCode?:     "PIZZA20",
  createdAt, updatedAt
}

// KitchenOrder
{
  kitchenOrderId, orderId, stationId,
  status: "QUEUED" | "IN_PROGRESS" | "READY",
  estimatedCompletionTime, startedAt, completedAt
}

// Delivery
{
  deliveryId, orderId, driverId?, partnerId?,
  status: "PENDING" | "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
  trackingUrl?, estimatedDeliveryTime, actualDeliveryTime?
}

// Offer
{
  offerId, code, type: "PERCENTAGE" | "FIXED" | "BOGO" | "FREE_ITEM",
  value, minOrderAmount, maxDiscount,
  validFrom, validUntil, usageLimit, usedCount,
  applicableProducts[], status: "ACTIVE" | "INACTIVE" | "EXPIRED"
}
```

---

## 5. API Design

### 5.1 Order Service
```
POST   /orders                       Create order (validate → persist → emit event)
GET    /orders/{orderId}            Get order details
GET    /orders/customer/{custId}    List customer orders (GSI)
PUT    /orders/{orderId}/cancel     Cancel order (with refund trigger)
GET    /orders/{orderId}/track       Live status for tracking UI
```

### 5.2 Kitchen Service
```
GET    /kitchen/orders               Pending + in-progress queue
GET    /kitchen/orders/{id}          Single kitchen ticket
PUT    /kitchen/orders/{id}/start    Start preparing
PUT    /kitchen/orders/{id}/ready    Mark ready → triggers Delivery Service
GET    /kitchen/stations             Station status board
PUT    /kitchen/stations/{id}/status Update station state
WS     /kitchen/live                 WebSocket push for real-time KDS
```

### 5.3 Delivery Service
```
POST   /deliveries                   Create delivery request
GET    /deliveries/{id}               Delivery status
PUT    /deliveries/{id}/assign        Assign internal driver
PUT    /deliveries/{id}/status        Update status (driver app)
GET    /drivers/available             Available drivers list
GET    /deliveries/{id}/track         Public tracking payload (lat/lng/eta)
POST   /partners/orders               Forward order to delivery partner
POST   /partners/webhooks/{partnerId} Receive partner status webhooks
```

### 5.4 Offer Service
```
POST   /offers                        Create offer (admin only)
GET    /offers/active                 List active offers (customer app)
POST   /offers/validate               Validate code against cart
POST   /offers/apply                  Apply to order (idempotent)
GET    /offers/customer/{custId}      Customer-specific offers
PUT    /offers/{id}                   Update offer (admin)
DELETE /offers/{id}                   Deactivate offer (soft delete)
```

### 5.5 Admin / Reporting
```
GET    /admin/dashboard               KPI tiles (today's orders, revenue, avg prep time)
GET    /admin/reports/sales           Sales by date range (CSV/JSON)
GET    /admin/reports/delivery        Delivery performance (SLA breaches)
GET    /admin/reports/customers       Cohort retention, top customers
GET    /admin/reports/inventory       Ingredient depletion forecast
GET    /admin/reports/offers          Offer redemption funnel
POST   /admin/reports/export          Async export to S3 (Lambda → generate presigned URL)
```

### 5.6 Payment Service
```
POST   /payments/checkout             Initiate payment (Stripe test mode)
POST   /payments/webhook             Stripe webhook handler
POST   /payments/refund              Issue refund
GET    /payments/{id}                 Payment status
```

---

## 6. Event-Driven Architecture

### 6.1 Event Bus
- Single custom EventBridge bus: `pizza-dev-event-bus`
- Rules route events to domain queues (SQS) and Lambda targets
- Archive enabled for replay/debugging (Pro feature; community: S3 archive)

### 6.2 Event Catalog
```typescript
type PizzaEvent =
  | OrderPlaced         | OrderConfirmed    | OrderCancelled
  | KitchenOrderCreated | KitchenStarted    | KitchenReady
  | DeliveryCreated     | DeliveryAssigned  | DeliveryPickedUp
  | DeliveryInTransit  | DeliveryCompleted
  | OfferApplied        | OfferExpired
  | PaymentSucceeded    | PaymentFailed     | RefundIssued
  | PartnerOrderSynced  | PartnerStatusReceived
```
Each event carries `eventId`, `eventType`, `occurredAt`, `source`, `correlationId`, `payload`, `version`.

### 6.3 EventBridge Rule Examples
```hcl
# Route kitchen-bound events
resource "aws_cloudwatch_event_rule" "kitchen_events" {
  event_bus_name = aws_cloudwatch_event_bus.pizza_bus.name
  pattern = jsonencode({
    source      = ["pizza.order"]
    detail-type = ["OrderPlaced", "OrderConfirmed"]
  })
}
# Target → SQS kitchen queue → Kitchen Lambda
```

### 6.4 Step Function — Order State Machine
States: `Placed → Confirmed → Preparing → Ready → OutForDelivery → Delivered`
Error paths: `Cancelled` (any time before `Preparing`), `PaymentFailed`
Use Step Functions Standard for long-running workflow (up to 1 year retention).

### 6.5 SQS Queues (with DLQs)
| Queue                          | DLQ                          | Visibility | Consumers              |
|--------------------------------|------------------------------|------------|------------------------|
| pizza-dev-order-events         | pizza-dev-order-events-dlq   | 60s        | Kitchen, Notification  |
| pizza-dev-kitchen-events       | pizza-dev-kitchen-events-dlq | 300s       | Delivery, Reporting    |
| pizza-dev-delivery-events      | pizza-dev-delivery-dlq       | 120s       | Reporting, Customer Ntf|
| pizza-dev-payment-events       | pizza-dev-payment-dlq        | 60s        | Order (update status)  |
| pizza-dev-partner-webhooks     | pizza-dev-partner-dlq        | 60s        | Delivery Service       |

---

## 7. Security & Guardrails

### 7.1 IAM
- **Per-service execution roles** with least-privilege scoped policies
- **No `Resource: "*"`** — always ARN-scoped
- Separate role per Lambda function (not shared)
- Cognito authorizer on API Gateway for protected routes
- Admin endpoints require `admin` group claim

### 7.2 Secrets
- Stripe keys, Cognito secrets, partner API tokens via Terraform `sensitive` vars
- In LocalStack dev: stored in `.env.local` (gitignored)
- In prod: AWS Secrets Manager / SSM Parameter Store (deployed via Terraform)

### 7.3 Network
- API Gateway is publicly accessible (HTTPS only)
- Lambda functions in VPC if ElastiCache required (NAT gateway in prod)
- DynamoDB endpoints via gateway VPC endpoints in prod

### 7.4 Code-Level Guardrails (opencode)
- `tflint` + `tfsec` run on every infra change
- ESLint strict TypeScript config; Prettier enforced
- Zod schemas validate all Lambda inputs (API & event sources)
- Idempotency keys required for order create, payment, offer apply
- No `any` types; no `console.log` in committed code (use structured logger)

---

## 8. opencode Configuration

### 8.1 opencode.json (project root)
See `.opencode/plans/opencode.json` — includes:
- 6 subagents: `infrastructure`, `backend`, `frontend`, `database`, `testing`, `devops`, `security`
- `playwright` MCP server for E2E testing
- Permission guardrails: deny `rm -rf`, `sudo`, `chmod`, edits to `*.env*`, `*.tfstate*`

### 8.2 Custom Skills (`.opencode/skills/<name>/SKILL.md`)

| Skill                  | Trigger keywords                        | Purpose                                                    |
|------------------------|-----------------------------------------|------------------------------------------------------------|
| `localstack-skill`     | "localstack", "local aws"               | Spin up LocalStack, configure endpoints, validate mocks   |
| `terraform-skill`      | "terraform", "tf", "infra"              | HCL patterns, module structure, tflint/tfsec usage          |
| `dynamodb-skill`       | "dynamodb", "table design", "gsi"       | Single-vs-multi table design, access patterns, GSIs/LSIs   |
| `lambda-skill`         | "lambda", "function", "handler"          | Handler structure, powertools, packaging, env injection   |
| `eventbridge-skill`    | "eventbridge", "event bus", "event rule"| Schema design, pattern matching, archive, replay          |
| `nextjs-skill`         | "next.js", "app router", "ssr"          | App Router, server actions, streaming, suspense boundaries |

### 8.3 Agents Needed

| Agent           | Role                                                                 |
|-----------------|----------------------------------------------------------------------|
| `infrastructure`| Author & apply Terraform against LocalStack; emit outputs          |
| `backend`       | TypeScript Lambda handlers, API Gateway integrations, Zod schemas   |
| `frontend`      | Next.js apps (customer, kitchen, delivery, admin), WebSockets       |
| `database`      | DynamoDB schema design, Terraform table resources, access patterns  |
| `testing`       | Vitest unit/integration, Playwright E2E, contract tests             |
| `devops`        | Docker compose for LocalStack, CI workflows, awslocal helpers      |
| `security`      | IAM least-privilege review, tfsec, secret exposure scan (read-only)  |

### 8.4 Guardrails Summary
- **Bash**: deny `rm -rf *`, `sudo *`, `chmod *`; everything else `ask`
- **Edit**: deny `*.env*`, `*.secret*`, `*.key`, `*.pem`, `*.tfstate*`
- **Infrastructure**: `terraform plan` required before `apply`; user must confirm
- **Code**: TypeScript strict, ESLint + Prettier, Zod validation on every entry point
- **State**: never commit `.tfstate` (gitignore + deny edit rule)
- **Costs**: LocalStack only for dev; prod AWS apply requires manual gate

---

## 9. Phased Development Plan

### Phase 1 — Foundation (Weeks 1–2)
**Goal**: LocalStack running, Terraform foundation modules, basic order flow.

1. Project scaffold: monorepo (pnpm workspaces), `infrastructure/`, `packages/`
2. Docker Compose with LocalStack service + init container
3. Terraform: `versions.tf`, `providers.tf` (LocalStack endpoints), foundation modules (iam, dynamodb, s3, sqs, sns, eventbridge)
4. Order domain Terraform: DynamoDB table, Lambda zips, API Gateway HTTP API
5. Backend: order create/get Lambda, Zod schemas, structured logging
6. Frontend (customer MVP): menu list, order form, order status page
7. opencode: write all 6 agents + 6 skills, install play(role) MCP

**Deliverable**: place an order via UI → persisted in DynamoDB → view in API.

---

### Phase 2 — Kitchen Operations (Weeks 3–4)
**Goal**: Kitchen Display System (KDS) with real-time updates.

1. Terraform: kitchen module (lambda, sqs, eventbridge rules, websocket api)
2. Backend: Kitchen service consuming order events, KitchenOrder CRUD, station mgmt
3. Frontend (kitchen app): KDS board (Kanban-style), status transitions, station view
4. WebSocket API Gateway for live push to kitchen + customer apps
5. EventBridge: OrderPlaced → rule → kitchen SQS → Lambda → KitchenOrderCreated
6. Customer app: real-time order status (WS subscription)

**Deliverable**: order placed → kitchen ticket appears → cook marks ready → customer sees update.

---

### Phase 3 — Delivery & Partners (Weeks 5–6)
**Goal**: Driver assignment, live tracking, partner integration.

1. Terraform: delivery module (lambda, sqs, sns, dynamodb, partner webhook lambdas)
2. Backend: Delivery service, Driver service, partner webhook handler (Uber/DoorDash mock)
3. Partner integration: outbound order sync (mock partner API in LocalStack), inbound webhook queue
4. Frontend (delivery app): driver dashboard, accept/decline deliveries, status updates, map
5. Customer app: live tracking map, ETA display
6. Step Function: driver-assignment workflow (internal first → partner fallback)

**Deliverable**: ready order → driver assigned (or partner) → customer tracks delivery live.

---

### Phase 4 — Offers & Payments (Weeks 7–8)
**Goal**: Promotional engine + Stripe test payments.

1. Terraform: offer module (lambda, dynamodb, eventbridge rules), payment module (lambda, sqs, secrets)
2. Backend: Offer service (CRUD, validate, apply — idempotent), Payment service (Stripe test mode, webhook)
3. EventBridge rule: OfferApplied → order recalculation Lambda
4. Frontend (customer): offer banner, promo code input at checkout, applied discount display
5. Frontend (admin): offer management CRUD, redemption funnel report
6. Refund flow: PaymentFailed/Cancelled → automatic refund via Step Function

**Deliverable**: customer applies promo → checkout via Stripe test card → order confirmed.

---

### Phase 5 — Reporting, Analytics & Operations (Weeks 9–10)
**Goal**: Admin dashboard, scheduled reports, operational tooling.

1. Terraform: reporting module (lambda, eventbridge schedule rules, S3 exports, CloudWatch dashboards/alarms)
2. Backend: Reporting Lambda aggregations (DynamoDB Scan + Streams), scheduled exports to S3, presigned URL retrieval
3. Frontend (admin portal): dashboard with Recharts, report filters (date range, store, partner), CSV/PDF export
4. Operations: store config CRUD, menu management UI, inventory alert Lambda (SNS → admin)
5. CloudWatch: business metrics (orders/min, avg prep time, delivery SLA), alarms on breach
6. X-Ray: trace order across services (Lambda → DynamoDB → EventBridge → SQS)

**Deliverable**: admin sees real-time KPIs + can export historical reports.

---

### Phase 6 — Advanced Features & Polish (Weeks 11–12)
**Goal**: Loyalty, recommendations, mobile, hardening.

1. Loyalty program: points accrual on delivery, tier-based offers, Terraform + backend + UI
2. Menu recommendations: simple collaborative filtering Lambda (top-pairs, last-orders)
3. Customer feedback: post-delivery rating Lambda → SNS → analytics
4. React Native mobile app (Expo): reuse API client; push notifications via SNS + Cognito
5. Performance: ElastiCache for menu/hot-offers, DynamoDB DAX note, CDN config documented
6. Hardening: load tests (artillery against LocalStack), chaos on SQS DLQ, full Playwright E2E suite
7. Documentation: API reference (OpenAPI generated from handlers), runbooks, architecture ADRs

**Deliverable**: production-grade demo with mobile app + docs.

---

## 10. Additional Feature Ideas (backlog)

- **Schedule-based menu**: breakfast/lunch/dinner auto-switch
- **Group ordering**: multiple contributors to one cart
- **Pre-ordering**: scheduled delivery for future time
- **Nutrition & allergen filters** on menu
- **Multi-store / multi-tenant** support (franchise mode)
- **Voice ordering** via Alexa skill (Lambda)
- **AI demand forecasting** → pre-stage ingredients (SageMaker notebook simulation)
- **Dynamic pricing**: surge pricing during peak hours (configurable)
- **Carbon offset** option at checkout (partner carbon API mock)
- **Chat support**: Lex bot → escalate to human (Connect simulation)

---

## 11. Project Structure (Monorepo)

```
pizza-app/
├── .opencode/
│   ├── plans/                    # this architecture + opencode.json (draft)
│   ├── agent/                    # agent .md files (moved to project root by user)
│   ├── skills/                  # 6 custom skills
│   └── opencode.json            # final config (user copies from plans/)
├── packages/
│   ├── frontend/
│   │   ├── customer/            # Next.js
│   │   ├── kitchen/             # Next.js
│   │   ├── delivery/            # Next.js
│   │   └── admin/               # Next.js
│   ├── backend/
│   │   ├── services/
│   │   │   ├── order/
│   │   │   ├── kitchen/
│   │   │   ├── delivery/
│   │   │   ├── offer/
│   │   │   ├── payment/
│   │   │   ├── reporting/
│   │   │   ├── partner/
│   │   │   └── notification/
│   │   └── shared/              # types, logger, error, zod-schemas
│   └── shared/                  # cross-cutting types, contracts, events
├── infrastructure/
│   ├── modules/                 # Terraform reusable modules
│   └── environments/
│       ├── dev/                 # LocalStack
│       └── prod/                # real AWS (documented)
├── docker/
│   └── docker-compose.yml        # LocalStack + init container
├── scripts/                      # bootstrap, seed, teardown
├── docs/
│   ├── architecture.md           # human-readable mirror of this plan
│   ├── adr/                       # architecture decision records
│   └── runbooks/
├── .github/workflows/
│   ├── infra-validate.yml
│   ├── backend-ci.yml
│   └── frontend-ci.yml
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── AGENTS.md                      # project conventions for agents
```

---

## 12. Success Metrics

**Technical**: p95 API < 200ms, 99.9% uptime, 100% critical-path test coverage, zero tfsec high findings.
**Business**: order → ready < 15 min, delivery SLA > 99%, offer redemption visibility.
**Learning outcomes**: master Terraform module design, event-driven serverless, DynamoDB access patterns, LocalStack workflows, agentic dev orchestration.

---

## 13. Next Steps

1. Confirm this architecture & phase plan (user).
2. Move `.opencode/plans/opencode.json` → `.opencode/opencode.json` (or project root).
3. Move `.opencode/plans/agent-infrastructure.md` → `.opencode/agent/infrastructure.md` (and create backend/frontend/database/testing/devops/security).
4. Create 6 skill folders under `.opencode/skills/` with `SKILL.md`.
5. Write `AGENTS.md` (project conventions).
6. Scaffold monorepo + Docker Compose for LocalStack.
7. Begin Phase 1.
