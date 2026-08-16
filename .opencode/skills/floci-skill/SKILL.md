---
name: floci-skill
description: Use when starting, configuring, or troubleshooting Floci (FLOSS Local Cloud) as the local AWS simulation for the pizza app. Also triggers on "localstack" (Floci is its drop-in replacement). Keywords: "floci", "local aws", "4566", "localstack".
---

# Floci Skill

## What is Floci
Floci (FLOSS Local Cloud, `floci/floci`) is a free, MIT-licensed AWS emulator and drop-in replacement for LocalStack Community (EOL March 2026). Same edge port **4566**, same `test`/`test` credentials, same `/_localstack/health` endpoint, same AWS SDK/CLI/Terraform provider surface. LocalStack init scripts mounted under `/etc/localstack/init/ready.d` run unchanged.

## When to use
- Bootstrapping Floci via Docker Compose (project: `docker/docker-compose.yml`)
- Verifying resources after `terraform apply` (`curl localhost:4566/_localstack/health`)
- Debugging endpoint connectivity from Lambda/frontend
- Seeding test data (menu, offers, drivers)
- Resetting state between dev sessions

## Project compose (docker/docker-compose.yml)
```yaml
services:
  floci:
    image: floci/floci:latest-compat
    ports:
      - "4566:4566"
      - "6379-6399:6379-6399"
    environment:
      FLOCI_HOSTNAME: localhost
      FLOCI_DEFAULT_REGION: us-east-1
      FLOCI_STORAGE_MODE: persistent
      FLOCI_STORAGE_PERSISTENT_PATH: /app/data
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./localstack/init:/etc/floci/init/ready.d:ro
      - ./localstack/init:/etc/localstack/init/ready.d:ro
```
- Use the `-compat` image when init scripts need the AWS CLI — it bundles `aws` + `boto3` preconfigured for `http://localhost:4566`.
- Init hook lifecycle: `boot.d` → `start.d` → `ready.d` (after APIs up) → `stop.d`. Mount read-only.
- `FLOCI_STORAGE_MODE`: `memory` (default), `persistent`, `hybrid`, `wal`.
- ElastiCache/RDS are proxied inside Floci — map `6379-6399` (Redis) / `7001-7099` (RDS) to use them from the host.

## Seed scripts (`docker/localstack/init/`)
Idempotent, run at `ready`:
- `01-seed-menu.sh` — menu products
- `02-seed-offers.sh` — 3 sample offers
- `03-seed-drivers.sh` — 5 test drivers

## Useful commands (host or compat image)
```bash
aws --endpoint-url http://localhost:4566 dynamodb list-tables
aws --endpoint-url http://localhost:4566 lambda list-functions
aws --endpoint-url http://localhost:4566 sqs list-queues
aws --endpoint-url http://localhost:4566 s3 ls
aws --endpoint-url http://localhost:4566 events list-event-buses
curl -s http://localhost:4566/_localstack/health
docker logs pizza-floci -f
```
Set `AWS_ENDPOINT_URL=http://localhost:4566` + `test/test` creds once (e.g. an `aws-floci` profile in `~/.aws/config`) and skip the flag.

## Feature availability (Floci 1.6.0, always-free)
| Feature | Status |
|--------------------------|--------|
| DynamoDB, S3, SQS, SNS, Lambda, API Gateway v1/v2, IAM, STS, CloudWatch, EventBridge, Cognito, ElastiCache, SES, Secrets Manager, Step Functions (`states`), KMS, Kinesis | running (see `/_localstack/health`) |
| EventBridge archives / replay | verify per feature; document fallback (S3 archive + replay Lambda) if unsupported |
| X-Ray | limited; rely on CloudWatch Logs + structured correlation IDs |

When a feature is unavailable, document the fallback in `docs/architecture.md` and the relevant Terraform module README.
