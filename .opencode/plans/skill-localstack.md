---
name: localstack-skill
description: Use when starting, configuring, or troubleshooting LocalStack as the local AWS simulation for the pizza app. Triggers on "localstack", "local aws", "docker compose localstack", "4566".
---

# LocalStack Skill

## When to use
- Bootstrapping LocalStack via Docker Compose
- Verifying resources exist after `terraform apply`
- Debugging endpoint connectivity from Lambda/frontend
- Seeding test data (menu, offers, drivers)
- Resetting state between dev sessions

## Standard docker-compose service
```yaml
services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"      # all AWS services edge
      - "4510-4559:4510-4559"
    environment:
      SERVICES: dynamodb,s3,sqs,sns,lambda,apigateway,apigatewayv2,cloudwatch,iam,sts,stepfunctions,events,cognitoidp,elasticache,ses
      DEBUG: "1"
      LAMBDA_EXECUTOR: docker  # or docker-reuse for hot reload
      PERSISTENCE: "1"        # persists state across restarts
      LOCALSTACK_AUTH_TOKEN: ${LOCALSTACK_AUTH_TOKEN:-}  # set for Pro
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
      - "./localstack/data:/var/lib/localstack"
      - "./localstack/init:/etc/localstack/init/ready.d"
```

## Init scripts (`localstack/init/`)
- `01-seed-menu.sh` — awslocal put items into menu table
- `02-seed-offers.sh` — create 3 sample offers
- `03-seed-drivers.sh` — register 5 test drivers

## Useful commands
```bash
awslocal dynamodb list-tables
awslocal lambda list-functions
awslocal sqs list-queues
awslocal s3 ls
awslocal logs describe-log-groups
awslocal events list-event-buses
docker logs localstack -f
```

## Pro vs Community quick reference
| Feature                  | Community | Pro |
|--------------------------|-----------|-----|
| EventBridge patterns     | partial    | full |
| EventBridge archives/replay | no      | yes |
| Step Functions           | no        | yes |
| Cognito hosted UI        | no        | yes |
| X-Ray                    | limited   | yes |
| DynamoDB Streams → Lambda | limited  | yes |
| Terraform provider auto-endpoint | no  | yes (tflocal) |

When a Pro-only feature is needed but unavailable, document the community fallback in `docs/architecture.md` and in the relevant Terraform module README.
