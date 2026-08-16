# End-to-end smoke test for the order service against Floci.
# Covers: POST /orders (create), GET /orders/{id}, idempotent replay.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1
$ErrorActionPreference = "Continue"

$apiEndpoint = terraform -chdir=infrastructure/environments/dev output -raw order_api_endpoint 2>$null
if (-not $apiEndpoint) { Write-Host "terraform output missing; run apply first" -ForegroundColor Red; exit 1 }
$apiId = ($apiEndpoint -replace "https://([^.]+)\..*", '$1')
$base = "http://localhost:4566/execute-api/$apiId/`$default"

$bodyFile = Join-Path $env:TEMP "pizza-smoke-body.json"
$body = '{"customerId":"cus_smoke","items":[{"itemId":"i1","productId":"prod_margherita","quantity":2,"unitPrice":9.99}],"deliveryAddress":{"street":"1 Test Rd","city":"Testville","zip":"00000"},"idempotencyKey":"99999999-9999-4999-8999-999999999999"}'
[System.IO.File]::WriteAllText($bodyFile, $body, [System.Text.UTF8Encoding]::new($false))

function Invoke-Check($name, $expected, $method, $path, $bodyFile) {
  $out = Join-Path $env:TEMP "pizza-smoke-out.json"
  $args = @("-s", "-o", $out, "-w", "%{http_code}", "-X", $method, "$base$path", "-H", "content-type: application/json")
  if ($bodyFile) { $args += "--data-binary", "@$bodyFile" }
  $code = & curl.exe @args
  $result = Get-Content $out -Raw
  if ($code -eq $expected) { Write-Host "PASS  $name ($code)" -ForegroundColor Green }
  else { Write-Host "FAIL  $name (expected $expected got $code) $result" -ForegroundColor Red }
  return $result
}

Write-Host "== Order smoke test ==" -ForegroundColor Cyan
$created = Invoke-Check "POST /orders" 201 "POST" "/orders" $bodyFile
$orderId = ($created | ConvertFrom-Json).orderId
if (-not $orderId) { Write-Host "no orderId returned; aborting" -ForegroundColor Red; exit 1 }

Invoke-Check "GET /orders/{id}" 200 "GET" "/orders/$orderId" $null | Out-Null
$replay = Invoke-Check "POST replay (idempotent)" 200 "POST" "/orders" $bodyFile
$replayed = ($replay | ConvertFrom-Json).replayed
if ($replayed -and ($replay | ConvertFrom-Json).orderId -eq $orderId) {
  Write-Host "PASS  replay returns same orderId" -ForegroundColor Green
} else {
  Write-Host "FAIL  replay mismatch" -ForegroundColor Red
}

Write-Host "== smoke test complete ==" -ForegroundColor Cyan
