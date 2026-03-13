#!/usr/bin/env bash
# migrate.sh — Safe migration runner with environment guard
# Usage: bash scripts/migrate.sh [dev|deploy]
# Run from repo root.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

MODE="${1:-dev}"
ENV_FILE="apps/api/.env"

echo ""
echo "  ClinicaPlus — Migration Runner"
echo "  ==============================="
echo ""

[[ ! -f "$ENV_FILE" ]] && echo -e "${RED}[ERROR]${NC} $ENV_FILE not found." && exit 1

source "$ENV_FILE" 2>/dev/null || true

[[ -z "${DIRECT_URL:-}" ]] && echo -e "${RED}[ERROR]${NC} DIRECT_URL not set in $ENV_FILE. Migrations require port 5432." && exit 1
[[ "${DIRECT_URL}" != *":5432/"* ]] && echo -e "${YELLOW}[WARN]${NC} DIRECT_URL does not contain port 5432. Are you sure this is the direct connection?"

if [[ "$MODE" == "deploy" ]]; then
  echo -e "${YELLOW}  MODE: deploy (production — no prompts, no new files)${NC}"
  echo -n "  Confirm production migration? (yes/no): "
  read -r CONFIRM
  [[ "$CONFIRM" != "yes" ]] && echo "Aborted." && exit 0
  pnpm --filter=api exec prisma migrate deploy
elif [[ "$MODE" == "dev" ]]; then
  echo -e "${BLUE}  MODE: dev (creates migration file if schema changed)${NC}"
  pnpm --filter=api exec prisma migrate dev
else
  echo -e "${RED}[ERROR]${NC} Unknown mode: $MODE. Use 'dev' or 'deploy'." && exit 1
fi

echo ""
echo -e "${GREEN}  ✓ Migration complete.${NC}"
echo ""
