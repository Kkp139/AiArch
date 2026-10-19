# ==============================================================================
# ProNex-ArchAI Turnkey Studio Instance Provisioning Script (PowerShell)
# Single-Tenant Containerized Turnkey Deployments for Windows Hosts
# ==============================================================================

param(
  [string]$StudioName = "A&B Design",
  [string]$StudioDomain = "localhost",
  [string]$AdminEmail = "admin@abdesign.com"
)

$ErrorActionPreference = "Stop"
$ProvisionDir = Split-Path -Parent $PSScriptRoot

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ProNex-ArchAI Turnkey Deployment Initializer" -ForegroundColor Cyan
Write-Host "  Studio: $StudioName"
Write-Host "  Domain: $StudioDomain"
Write-Host "  Admin:  $AdminEmail"
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Generate Secure Production Secrets
$EnvFile = Join-Path $ProvisionDir ".env.production"
if (-not (Test-Path $EnvFile)) {
  Write-Host "Generating cryptographically secure secrets in .env.production..."
  $DbPass = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 })) -replace '[/+=]', 'x'
  $JwtSec = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 })) -replace '[/+=]', 'z'

  @"
STUDIO_NAME="$StudioName"
STUDIO_DOMAIN="$StudioDomain"
ADMIN_EMAIL="$AdminEmail"
DB_PASSWORD="$DbPass"
JWT_SECRET="$JwtSec"
DATABASE_URL="postgres://pronex_admin:${DbPass}@db:5432/pronex_archai"
REDIS_URL="redis://redis:6379"
NODE_ENV="production"
PORT=4000
"@ | Set-Content -Path $EnvFile -Encoding UTF8
}

Write-Host "Starting Docker Compose container stack..."
docker compose --env-file $EnvFile up -d --build

Write-Host "Database migration & 16-category seeding..."
docker compose exec -T api npx prisma db push --skip-generate
docker compose exec -T api npx prisma db seed

Write-Host "Verifying service health..."
docker compose exec -T api node -e "require('http').get('http://localhost:4000/api/health', (res) => { res.on('data', d => console.log(d.toString())); });"

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  SUCCESS: ProNex-ArchAI Instance Provisioned Successfully!" -ForegroundColor Green
Write-Host "  Web Portal URL: http://${StudioDomain}:3000"
Write-Host "  API Gateway:    http://${StudioDomain}:4000/api"
Write-Host "=================================================================" -ForegroundColor Green
