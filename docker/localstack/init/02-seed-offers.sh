#!/bin/bash
set -euo pipefail

# Seed sample offers (idempotent). Uses the preconfigured aws CLI in the Floci compat image.
OFFERS_TABLE="pizza-dev-offers"

aws dynamodb put-item --table-name "$OFFERS_TABLE" --item '{
  "offerId": {"S": "off_welcome20"},
  "code": {"S": "WELCOME20"},
  "type": {"S": "PERCENTAGE"},
  "value": {"N": "20"},
  "minOrderAmount": {"N": "15.00"},
  "maxDiscount": {"N": "10.00"},
  "validFrom": {"S": "2026-01-01T00:00:00Z"},
  "validUntil": {"S": "2030-12-31T23:59:59Z"},
  "usageLimit": {"N": "10000"},
  "usedCount": {"N": "0"},
  "status": {"S": "ACTIVE"}
}' || echo "seed welcome20: already exists or failed"

aws dynamodb put-item --table-name "$OFFERS_TABLE" --item '{
  "offerId": {"S": "off_freeside"},
  "code": {"S": "FREESIDE"},
  "type": {"S": "FREE_ITEM"},
  "value": {"N": "0"},
  "minOrderAmount": {"N": "25.00"},
  "maxDiscount": {"N": "4.50"},
  "validFrom": {"S": "2026-01-01T00:00:00Z"},
  "validUntil": {"S": "2030-12-31T23:59:59Z"},
  "usageLimit": {"N": "5000"},
  "usedCount": {"N": "0"},
  "status": {"S": "ACTIVE"}
}' || echo "seed freeside: already exists or failed"

echo "offers seeded"
