#!/usr/bin/env bash
# migrate.sh — ClinicaPlus
# Valida antes de migrar. Uso: ./migrate.sh [migration-name]
set -euo pipefail

NAME=${1:-}
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "[migrate] A validar antes de migrar..."

# Testes devem passar
if ! pnpm test --run --filter=api > /tmp/test-output.txt 2>&1; then
  echo -e "${RED}✗ Testes falharam — migração abortada${NC}"
  cat /tmp/test-output.txt
  exit 1
fi
echo -e "${GREEN}✓ Testes passaram${NC}"

# Build deve compilar
if ! pnpm build --filter=api > /dev/null 2>&1; then
  echo -e "${RED}✗ Build falhou — migração abortada${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build compilou${NC}"

# Executar migration
if [ -n "$NAME" ]; then
  pnpm prisma migrate dev --name "$NAME"
else
  pnpm prisma migrate deploy
fi

echo -e "${GREEN}✓ Migration aplicada${NC}"

# Seeds obrigatórios pós-migration
echo "[migrate] A correr seeds obrigatórios..."
npx tsx apps/api/src/seeds/plano-limites.seed.ts
echo -e "${GREEN}✓ Seeds concluídos${NC}"
