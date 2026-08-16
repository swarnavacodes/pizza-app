#!/bin/bash
set -euo pipefail

# Seed test drivers (idempotent). Uses the preconfigured aws CLI in the Floci compat image.
DRIVERS_TABLE="pizza-dev-drivers"

for d in "drv_alice:Alice:BIKE" "drv_bob:Bob:CAR" "drv_carla:Carla:BIKE" "drv_dan:Dan:SCOOTER" "drv_ella:Ella:CAR"; do
  IFS=':' read -r id name vehicle <<< "$d"
  aws dynamodb put-item --table-name "$DRIVERS_TABLE" --item "{
    \"driverId\": {\"S\": \"$id\"},
    \"name\": {\"S\": \"$name\"},
    \"phone\": {\"S\": \"555-000-$id\"},
    \"vehicleType\": {\"S\": \"$vehicle\"},
    \"status\": {\"S\": \"AVAILABLE\"}
  }" || true
done

echo "drivers seeded"
