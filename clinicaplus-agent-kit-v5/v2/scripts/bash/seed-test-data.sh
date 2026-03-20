#!/usr/bin/env bash
# seed-test-data.sh — ClinicaPlus dados de teste realistas (pt-AO)
# Uso: ./seed-test-data.sh [--reset]
set -euo pipefail

RESET=${1:-}

if [ "$RESET" = "--reset" ]; then
  echo "[seed] A limpar dados de teste..."
  npx tsx apps/api/src/seeds/reset-test.ts
fi

echo "[seed] A criar dados de teste..."
npx tsx apps/api/src/seeds/test-data.seed.ts

echo "[seed] ✓ Concluído"
echo "[seed] Credenciais de teste:"
echo "  Admin:        admin@clinicateste.ao / Test1234!"
echo "  Médico:       dr.carlos@clinicateste.ao / Test1234!"
echo "  Recepcionista: recepcao@clinicateste.ao / Test1234!"
echo "  Slug clínica: clinica-teste"
