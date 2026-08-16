# Pizza Management System

**Distributed serverless pizza management system** — order, kitchen, delivery, offers, payments & reporting.

Built as a learning project for **agentic development patterns** with a focus on serverless best practices.

---

## Architecture Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Infra** | Terraform + Floci (Docker-based AWS emulator) | 9 DynamoDB tables, 5 SQS queues + 5 DLQs, 2 SNS topics, EventBridge bus, 2 S3 buckets |
| **Backend** | TypeScript / Node 20 / Powertools | 8 Lambda services (order, kitchen, delivery, offer, payment, reporting, partner, notification) |
| **Shared** | Zod schemas, HttpError/AppError, api helpers, EventBridge envelopes (`PizzaEvent<T>`) | `@pizza/shared`, `@pizza/backend-shared` |
| **Frontend** | Next.js 14 App Router, Server Components, Tailwind, TanStack Query, Zustand | Customer app with dark "organic" theme |

**Floci** (not LocalStack) — drop-in emulator on port `4566`, same `test/test` creds, free always.

**Two environments**: `dev` (Floci) and `prod` (real AWS — documented, not applied without approval).

---

## Monorepo Layout

```
packages/
  frontend/customer   # Next.js ordering UI (dark premium organic)
  backend/services/   # Order, Kitchen, Delivery, Offer, Payment, Reporting services
  backend/shared      # Logger, errors, powertools, api helpers
  shared              # Cross-cutting contracts, event schemas

infrastructure/
  modules/            # DynamoDB, SQS, SNS, EventBridge, S3 modules
  environments/       # dev (Floci) and prod configs

docker/               # Floci composer, seed scripts
scripts/              # seed.ps1, smoke.ps1
docs/                # Architecture markdown
.opencode/            # 7 agents, 7 skills, guardrails
```

---

## Quick Start (Local Development)

```bash
# 1. Start Floci (Docker Compose)
docker compose -f docker/docker-compose.yml up -d

# 2. Initialize Terraform (Floci)
cd infrastructure
terraform init         # configure Floci provider
terraform validate     # confirm syntax
terraform plan         # review changes
terraform apply        # apply Floci resources

# 3. Seed the database
.\scripts\seed.ps1     # populates menu, offers, drivers

# 4. Run backend dev servers
cd packages/backend/services/order && pnpm dev
cd packages/backend/services/kitchen && pnpm dev
# ... repeat for other services

# 5. Run frontend dev server
cd packages/frontend/customer && pnpm dev
# App available at http://localhost:3000
```

---

## Directory Map

| Path | Purpose |
|------|---------|
| `infrastructure/modules/` | Terraform modules (DynamoDB, SQS, SNS, etc.) |
| `infrastructure/environments/dev/main.tf` | Dev env: wires order + kitchen modules |
| `packages/backend/services/order/` | Order Lambda + API Gateway v2 HTTP API |
| `packages/frontend/customer/` | Customer Next.js app (menu, order, tracking) |
| `packages/shared/` | Shared Zod schemas and envelopes |
| `packages/backend-shared/` | Powertools, HttpError, AppError, api utilities |
| `docker/docker-compose.yml` | Floci emulator setup |
| `docs/architecture.md` | Live architecture status doc |
| `.opencode/` | 7 agent configs, 7 skill definitions, guardrails |

---

## Key Conventions

| Area | Rule |
|------|------|
| **Commits** | Conventional commits (`feat:`, `fix:`, `chore:`, `infra:`, `docs:`) |
| **No secrets** | Never commit `.env*`, `*.tfstate*`, `*.key`, `*.pem` |
| **Floci vs AWS** | `dev` uses Floci endpoint (`4566`); `prod` uses real AWS (conditional vars) |
| **Payload format** | API Gateway v2 HTTP uses payload format `1.0` (works on Floci); `2.0` delivers escaped quotes |
| **X-Ray** | Opt-in via `XRAY_ENABLED=true` env var (default off); observability via CloudWatch Logs |
| **Idempotency** | Required on create/apply/payment; DynamoDB transactions verified on Floci |
| **Theme (customer)** | `bg-[#090e0b]` ultra-dark, `#10B981` accent green, glassmorphism cards, Inter font |
| **Testing** | Vitest for unit/integration (Floci-backed); Coverage gate ≥ 80% on backend services |

---

## Project History

- **Initial scaffold**: monorepo setup, Terraform foundation, Floci Docker compose, shared packages
- **Order service**: POST/GET handlers, transactional idempotency, EventBridge emission, esbuild CJS bundles
- **Kitchen service**: Lambda + EventBridge rule + SQS + scoped IAM, X-Ray tracing active
- **UI refactor**: Dark organic theme (`bg-[#090e0b]`, `#10B981` accent, glassmorphism cards, diet badges)
- **Git push**: Repo hosted at `https://github.com/swarnavacodes/pizza-app.git`

---

## Agent Collaboration (Per AGENTS.md)

| Agent | Output | Consumes |
|-------|--------|----------|
| **infra** | ARNs, queue URLs, table names | `backend` agent env config |
| **database** | Table schemas | `infrastructure` implements in Terraform |
| **backend** | Event contracts | `frontend` and `testing` consume |
| **security** | Read-only | Reviews IAM, tfsec, secret exposure |
| **devops** | Docker Compose, init scripts, CI workflows | Helpers, awslocal |

---

## Learn & Iterate

This project embraces **agentic development** as a learning pattern:

- Prompt quality improves with each session (context → constraints → verification)
- Bugs are treated as system feedback, not failures (e.g., `.next` cache issue)
- Cross-agent hand-offs are explicit (infra → backend → frontend)
- Definition of done covers code + tests + docs + architecture

---

## License

MIT — free to learn, fork, and adapt. No secrets or AWS credentials committed.

---

*Built with Floci, Terraform, Powertools, and a whole lot of intentional practice.*