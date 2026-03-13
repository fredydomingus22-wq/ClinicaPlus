#!/usr/bin/env bash
# seed.sh — Seed database with demo data.
# Run from repo root: bash scripts/seed.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

ENV_FILE="apps/api/.env"
[[ ! -f "$ENV_FILE" ]] && echo -e "${RED}[ERROR]${NC} $ENV_FILE not found." && exit 1
source "$ENV_FILE" 2>/dev/null || true

echo ""
echo "  ClinicaPlus — Database Seed"
echo "  ============================"
echo ""

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo -e "${RED}[ERROR]${NC} NODE_ENV is 'production'. Seeding in production is not allowed."
  echo "  If you intentionally want to seed staging, set NODE_ENV=staging in .env."
  exit 1
fi

echo -e "${YELLOW}  This will add demo data to your database.${NC}"
echo -e "${YELLOW}  Existing data is preserved (upsert — safe to run multiple times).${NC}"
echo ""
echo -n "  Continue? (y/N): "
read -r CONFIRM
[[ ! "$CONFIRM" =~ ^[Yy]$ ]] && echo "Aborted." && exit 0

pnpm --filter=api exec prisma db seed

echo ""
echo -e "${GREEN}  ✓ Seed complete.${NC}"
echo ""
echo "  Demo credentials:"
echo "    Admin:          admin@demo.ao        / Demo1234!"
echo "    Médico:         carlos@demo.ao        / Demo1234!"
echo "    Recepcionista:  beatriz@demo.ao       / Demo1234!"
echo "    Paciente:       joao@demo.ao          / Demo1234!"
echo ""
