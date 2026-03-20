#!/usr/bin/env bash
# smoke-test.sh — ClinicaPlus pós-deploy
# Uso: ./smoke-test.sh [base_url] [token]
# Exit: 0 = tudo OK, 1 = alguma falha

set -euo pipefail

BASE=${1:-http://localhost:3000}
TOKEN=${2:-$SMOKE_TEST_TOKEN}
PASS=0; FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}✗${NC} $1 — $2"; ((FAIL++)); }

check() {
  local desc=$1; local method=$2; local path=$3
  local expected_status=${4:-200}; local body=${5:-}

  local args=(-s -o /tmp/smoke_body.txt -w "%{http_code}" -X "$method")
  args+=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
  [ -n "$body" ] && args+=(-d "$body")

  local status
  status=$(curl "${args[@]}" "$BASE$path")

  if [ "$status" = "$expected_status" ]; then
    ok "$desc ($status)"
  else
    fail "$desc" "esperado $expected_status, recebeu $status — $(cat /tmp/smoke_body.txt | head -c 200)"
  fi
}

echo "════════════════════════════════════"
echo " ClinicaPlus Smoke Test — $BASE"
echo "════════════════════════════════════"

echo -e "\n[Core]"
check "Health endpoint"              GET  /health                             200
check "Auth — token inválido → 401" GET  /api/agendamentos                   401 "" ""
# Override token para forçar 401
TOKEN_ORIG=$TOKEN; TOKEN="invalid-token"
check "Auth — token inválido → 401" GET  /api/agendamentos                   401
TOKEN=$TOKEN_ORIG

echo -e "\n[Agendamentos]"
check "Listar agendamentos"          GET  /api/agendamentos                   200
check "Agendamentos de hoje"         GET  "/api/agendamentos?data=$(date +%Y-%m-%d)" 200

echo -e "\n[Financeiro]"
check "Listar faturas"               GET  /api/faturas                        200

echo -e "\n[Plataforma]"
check "Subscrição actual"            GET  /api/subscricoes/actual             200
check "Uso actual"                   GET  /api/subscricoes/uso                200

echo -e "\n[WhatsApp — espera 402 sem plano PRO]"
# Este endpoint retorna 402 se plano BASICO — é comportamento correcto
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  -H "Authorization: Bearer $TOKEN" "$BASE/api/whatsapp/instancias/estado")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "402" ]; then
  ok "WhatsApp estado — resposta esperada ($STATUS)"
else
  fail "WhatsApp estado" "esperado 200 ou 402, recebeu $STATUS"
fi

echo -e "\n════════════════════════════════════"
echo -e " ✓ $PASS passaram  ✗ $FAIL falharam"
echo "════════════════════════════════════"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
