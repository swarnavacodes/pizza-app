# Host-side seeding for Floci (Windows). Same seed data as docker/localstack/init/*.sh.
# Uses --cli-input-json file:// to avoid PS 5.1 native-arg quoting issues.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/seed.ps1
$ErrorActionPreference = "Continue"

$env:AWS_ENDPOINT_URL = "http://localhost:4566"
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:AWS_DEFAULT_REGION = "us-east-1"

$seedDir = Join-Path $env:TEMP "pizza-seed"
New-Item -ItemType Directory -Force -Path $seedDir | Out-Null

function Batch-Put($table, $items) {
  $requests = @()
  foreach ($item in $items) {
    $requests += @{ PutRequest = @{ Item = $item } }
  }
  $payload = @{ $table = $requests }
  $file = Join-Path $seedDir "$table.json"
  $json = $payload | ConvertTo-Json -Depth 20 -Compress
  [System.IO.File]::WriteAllText($file, $json, [System.Text.UTF8Encoding]::new($false))
  & aws dynamodb batch-write-item --request-items ("file://" + $file) 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "seeded $table ($($items.Count) items)" -ForegroundColor Green }
  else { Write-Host "FAILED $table (exit $LASTEXITCODE)" -ForegroundColor Red }
}

$menu = @(
  @{ productId = @{ S = "prod_margherita" }; name = @{ S = "Margherita" }; description = @{ S = "San Marzano tomato, fresh mozzarella, basil" }; category = @{ S = "PIZZA" }; basePrice = @{ N = "9.99" }; availableSizes = @{ L = @(@{ S = "SMALL" }, @{ S = "MEDIUM" }, @{ S = "LARGE" }) }; availableCrusts = @{ L = @(@{ S = "THIN" }, @{ S = "CLASSIC" }) }; toppings = @{ L = @(@{ S = "extra mozzarella" }, @{ S = "basil" }) } },
  @{ productId = @{ S = "prod_pepperoni" }; name = @{ S = "Pepperoni" }; description = @{ S = "Classic pepperoni, mozzarella, tomato sauce" }; category = @{ S = "PIZZA" }; basePrice = @{ N = "12.49" }; availableSizes = @{ L = @(@{ S = "SMALL" }, @{ S = "MEDIUM" }, @{ S = "LARGE" }) }; availableCrusts = @{ L = @(@{ S = "THIN" }, @{ S = "CLASSIC" }, @{ S = "STUFFED" }) }; toppings = @{ L = @(@{ S = "extra pepperoni" }, @{ S = "jalapenos" }) } },
  @{ productId = @{ S = "prod_coke" }; name = @{ S = "Coca-Cola" }; description = @{ S = "330ml can, ice cold" }; category = @{ S = "BEVERAGES" }; basePrice = @{ N = "2.50" }; availableSizes = @{ L = @(@{ S = "REGULAR" }) }; availableCrusts = @{ L = @() }; toppings = @{ L = @() } }
)
Batch-Put "pizza-dev-menu" $menu

$offers = @(
  @{ offerId = @{ S = "off_welcome20" }; code = @{ S = "WELCOME20" }; type = @{ S = "PERCENTAGE" }; value = @{ N = "20" }; minOrderAmount = @{ N = "15.00" }; maxDiscount = @{ N = "10.00" }; validFrom = @{ S = "2026-01-01T00:00:00Z" }; validUntil = @{ S = "2030-12-31T23:59:59Z" }; usageLimit = @{ N = "10000" }; usedCount = @{ N = "0" }; status = @{ S = "ACTIVE" } },
  @{ offerId = @{ S = "off_freeside" }; code = @{ S = "FREESIDE" }; type = @{ S = "FREE_ITEM" }; value = @{ N = "0" }; minOrderAmount = @{ N = "25.00" }; maxDiscount = @{ N = "4.50" }; validFrom = @{ S = "2026-01-01T00:00:00Z" }; validUntil = @{ S = "2030-12-31T23:59:59Z" }; usageLimit = @{ N = "5000" }; usedCount = @{ N = "0" }; status = @{ S = "ACTIVE" } }
)
Batch-Put "pizza-dev-offers" $offers

$drivers = @(
  @{ driverId = @{ S = "drv_alice" }; name = @{ S = "Alice" }; phone = @{ S = "555-000-drv_alice" }; vehicleType = @{ S = "BIKE" }; status = @{ S = "AVAILABLE" } },
  @{ driverId = @{ S = "drv_bob" }; name = @{ S = "Bob" }; phone = @{ S = "555-000-drv_bob" }; vehicleType = @{ S = "CAR" }; status = @{ S = "AVAILABLE" } },
  @{ driverId = @{ S = "drv_carla" }; name = @{ S = "Carla" }; phone = @{ S = "555-000-drv_carla" }; vehicleType = @{ S = "BIKE" }; status = @{ S = "AVAILABLE" } },
  @{ driverId = @{ S = "drv_dan" }; name = @{ S = "Dan" }; phone = @{ S = "555-000-drv_dan" }; vehicleType = @{ S = "SCOOTER" }; status = @{ S = "AVAILABLE" } },
  @{ driverId = @{ S = "drv_ella" }; name = @{ S = "Ella" }; phone = @{ S = "555-000-drv_ella" }; vehicleType = @{ S = "CAR" }; status = @{ S = "AVAILABLE" } }
)
Batch-Put "pizza-dev-drivers" $drivers

Write-Host "Seed complete."
