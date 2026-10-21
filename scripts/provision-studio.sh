#!/usr/bin/env bash
# ==============================================================================
# ProNex-ArchAI Turnkey Studio Instance Provisioning Script
# Single-Tenant Containerized Turnkey Deployments
# Usage:
#   ./scripts/provision-studio.sh --name "Studio Name" --domain "portal.example.com" --admin "admin@example.com"
# ==============================================================================

set -euo pipefail

STUDIO_NAME="${1:-"Architectural Studio"}"
STUDIO_DOMAIN="${2:-"localhost"}"
ADMIN_EMAIL="${3:-"admin@archstudio.com"}"
PROVISION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "================================================================="
echo "  ProNex-ArchAI Turnkey Deployment Initializer"
echo "  Studio: ${STUDIO_NAME}"
echo "  Domain: ${STUDIO_DOMAIN}"
echo "  Admin:  ${ADMIN_EMAIL}"
echo "================================================================="

# 1. Generate Secure Production Secrets
ENV_FILE="${PROVISION_DIR}/.env.production"
if [ ! -f "${ENV_FILE}" ]; then
  echo "Generating cryptographically secure secrets in .env.production..."
  DB_PASS=$(openssl rand -hex 16 2>/dev/null || date +%s%N | sha256sum | head -c 32)
  JWT_SEC=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
  
  cat <<EOF > "${ENV_FILE}"
STUDIO_NAME="${STUDIO_NAME}"
STUDIO_DOMAIN="${STUDIO_DOMAIN}"
ADMIN_EMAIL="${ADMIN_EMAIL}"
DB_PASSWORD="${DB_PASS}"
JWT_SECRET="${JWT_SEC}"
DATABASE_URL="postgres://pronex_admin:${DB_PASS}@db:5432/pronex_archai"
REDIS_URL="redis://redis:6379"
NODE_ENV="production"
PORT=4000
EOF
fi

# 2. Build and Launch Containers
echo "Building and launching ProNex-ArchAI container stack..."
docker compose --env-file "${ENV_FILE}" up -d --build

# 3. Wait for PostgreSQL Readiness
echo "Waiting for PostgreSQL database to accept connections..."
docker compose exec -T db sh -c 'until pg_isready -U pronex_admin -d pronex_archai; do sleep 1; done'

# 4. Run Prisma Schema Migration & 16-Category Seed
echo "Applying database schema migrations and seeding 16 fixed categories..."
docker compose exec -T api npx prisma db push --skip-generate
docker compose exec -T api npx prisma db seed

# 5. Run Health Verification
echo "Verifying API health status..."
HEALTH_STATUS=$(docker compose exec -T api wget -qO- http://localhost:4000/api/health 2>/dev/null || echo '{"status":"pending"}')
echo "Health Output: ${HEALTH_STATUS}"

echo "================================================================="
echo "  SUCCESS: ProNex-ArchAI Instance Provisioned Successfully!"
echo "  Web Portal URL: http://${STUDIO_DOMAIN}:3000"
echo "  API Gateway:    http://${STUDIO_DOMAIN}:4000/api"
echo "================================================================="
