#!/usr/bin/env bash
# seed-planos.sh — popular tabela PlanoLimite (idempotente, safe para correr múltiplas vezes)
set -euo pipefail
echo "=== Seed: Limites de Plano ==="
pnpm --filter=api exec ts-node prisma/seeds/planLimits.ts
echo "✓ PlanoLimite seed concluído"
echo ""
echo "Verificar:"
echo "  pnpm db:studio   → tabela plano_limites deve ter 3 registos (BASICO, PRO, ENTERPRISE)"
