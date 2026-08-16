# AGENTS.md — Project Conventions for opencode Agents

> This file is referenced by `opencode.json` `instructions` and is loaded into every agent's system context. Keep it authoritative and concise.

## Project: Pizza Management System (Serverless, LocalStack, Terraform)

### Environment
- AWS resources are simulated by **LocalStack** (`http://localhost:4566`), started via `docker/docker-compose.yml`.
- All infrastructure is defined in **Terraform HCL** under `infrastructure/`. No CDK/SST/awslocal ad-hoc resource creation.
- Two environments: `dev` (LocalStack) and `prod` (real AWS — documented, not applied without explicit approval).

### Monorepo layout
```
packages/frontend/{customer,kitchen,delivery,admin}
packages/backend/services/{order,kitchen,delivery,offer,payment,reporting,partner,notification}
packages/backend/shared        # logger, errors, powertools, schemas
packages/shared                # cross-cutting contracts, event schemas
infrastructure/modules/<service>
infrastructure/environments/{dev,prod}
docker/  scripts/  docs/
```

### Backend conventions
- TypeScript strict, ESM, Node 20.
- Every Lambda handler validated with **Zod** at entry.
- Powertools logger/metrics/tracer; **no `console.log`**.
- Idempotency keys required on create/apply/payment.
- Errors: `HttpError` (4xx) / `AppError` (5xx → retry → DLQ).
- Events are wrapped in `PizzaEvent<T>` envelope from `packages/shared`.

### Frontend conventions
- Next.js 14 App Router, Server Components by default, `'use client'` only when needed.
- shadcn/ui + Tailwind; TanStack Query for client data; Zustand for local UI state.
- All API access via `lib/api-client.ts` (typed) → API Gateway; never call DynamoDB directly.
- WS messages schema-parsed on receipt.

### Infrastructure conventions
- Run order: `terraform fmt` → `init -upgrade` → `validate` → `tflint` → `tfsec` → `plan` → **confirm** → `apply`.
- LocalStack endpoints configured in `providers.tf`; `s3_use_path_style = true`; `skip_*` flags set.
- Least-privilege IAM: scoped ARNs, per-function roles, no `Resource: "*"`.
- Every module outputs ARNs + names for downstream agents.
- No secrets in HCL; `sensitive = true` vars only; `.tfstate` never committed (gitignored).

### Testing
- Vitest for unit/integration (LocalStack-backed); Playwright for E2E.
- Coverage gate ≥ 80% on backend services.

### Commit / Git
- Conventional commits (`feat:`, `fix:`, `chore:`, `infra:`, `docs:`).
- Never commit `.env*`, `*.tfstate*`, `*.key`, `*.pem`.
- Do not push or open PRs unless explicitly asked.

### Agent collaboration
- `infrastructure` agent outputs (ARNs, queue URLs, table names) feed `backend` agent env config.
- `database` agent defines table schemas; `infrastructure` implements them in Terraform.
- `backend` agent emits event contracts → `frontend` and `testing` agents consume them.
- `security` agent is read-only (cannot edit); reviews IAM policies, tfsec results, secret exposure.
- `devops` agent owns Docker Compose, init scripts, CI workflows, awslocal helpers.

### LocalStack Pro vs Community
- Pro features (EventBridge patterns/archives, Step Functions, X-Ray, Cognito hosted UI, DynamoDB Streams) are assumed available; if not, document community fallback in the relevant module README and `docs/architecture.md`.

### Definition of done (per feature)
1. Terraform module written + validated
2. Lambda handlers + Zod schemas + tests passing
3. Frontend wired + E2E smoke test green
4. Event contract added to `packages/shared`
5. `docs/architecture.md` updated if topology changed
6. tflint + tfsec + ESLint + Vitest all green
