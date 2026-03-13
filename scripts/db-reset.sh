#!/usr/bin/env bash
# db-reset.sh — DANGEROUS. Destroys all data and re-migrates.
# Only for development. Blocked in production.
# Run from repo root: bash scripts/db-reset.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

ENV_FILE="apps/api/.env"
[[ ! -f "$ENV_FILE" ]] && echo -e "${RED}[ERROR]${NC} $ENV_FILE not found." && exit 1
source "$ENV_FILE" 2>/dev/null || true

echo ""
echo -e "${RED}  ██████████████████████████████████████████${NC}"
echo -e "${RED}  ██  DATABASE RESET — DESTROYS ALL DATA  ██${NC}"
echo -e "${RED}  ██████████████████████████████████████████${NC}"
echo ""

if [[ "${NODE_ENV:-development}" != "development" ]]; then
  echo -e "${RED}[BLOCKED]${NC} NODE_ENV is '${NODE_ENV}'. Reset is only allowed in development."
  exit 1
fi

if [[ "${DATABASE_URL}" == *"supabase.com"* ]] && [[ "${DATABASE_URL}" != *"-dev"* ]]; then
  echo -e "${RED}[BLOCKED]${NC} DATABASE_URL looks like a non-dev Supabase project."
  echo "  Only use reset with a project named *-dev."
  exit 1
fi

echo -e "${YELLOW}  This will:"
echo "    1. Drop all tables"
echo "    2. Re-run all migrations"
echo "    3. Optionally re-seed demo data"
echo ""
echo -e "  Database: ${DATABASE_URL%%@*}@..."
echo ""
echo -n "  Type 'RESET' to confirm: "
read -r CONFIRM

[[ "$CONFIRM" != "RESET" ]] && echo "Aborted." && exit 0

echo ""
echo "  Resetting..."
pnpm --filter=api exec prisma migrate reset --force

echo ""
echo -n "  Seed with demo data? (y/N): "
read -r SEED
if [[ "$SEED" =~ ^[Yy]$ ]]; then
  pnpm --filter=api exec prisma db seed
  echo -e "${GREEN}  ✓ Reset and seed complete.${NC}"
else
  echo -e "${GREEN}  ✓ Reset complete (no seed).${NC}"
fi
echo ""
