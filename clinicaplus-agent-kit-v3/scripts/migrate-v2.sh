#!/usr/bin/env bash
# migrate-v2.sh — aplicar as 5 migrations v2 com validação prévia
set -euo pipefail
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "=== ClinicaPlus v2 — Migrations ==="

# Verificar que tests passam antes de migrar
echo "→ Verificar pnpm test..."
pnpm test --run --filter=api || { echo -e "${RED}Tests falharam. Não migrar.${NC}"; exit 1; }
echo -e "${GREEN}✓ Tests passam${NC}"

# Verificar que build passa
echo "→ Verificar build..."
pnpm build --filter=api || { echo -e "${RED}Build falhou.${NC}"; exit 1; }
echo -e "${GREEN}✓ Build OK${NC}"

# Aplicar migrations
echo "→ Aplicar migrations..."
pnpm db:migrate

echo ""
echo -e "${GREEN}Migrations aplicadas. Correr seed de planos:${NC}"
echo "  bash scripts/seed-planos.sh"
