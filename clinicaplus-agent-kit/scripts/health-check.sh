#!/usr/bin/env bash
# health-check.sh — Verify all services are responding correctly.
# Usage: bash scripts/health-check.sh [local|staging|prod]
# Run from repo root.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
PASS=0; FAIL=0

check_url() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"
  echo -n "  $label ($url)... "
  STATUS=$(curl -s -o /tmp/hc_body.txt -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "$expected" ]]; then
    echo -e "${GREEN}HTTP $STATUS ✓${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}HTTP $STATUS ✗ (expected $expected)${NC}"
    [[ -s /tmp/hc_body.txt ]] && cat /tmp/hc_body.txt | head -5
    FAIL=$((FAIL + 1))
  fi
}

ENV="${1:-local}"

case "$ENV" in
  local)
    API_URL="http://localhost:3001"
    WEB_URL="http://localhost:5173"
    ;;
  staging)
    API_URL="https://api-staging.clinicaplus.ao"
    WEB_URL="https://staging.clinicaplus.ao"
    ;;
  prod|production)
    API_URL="https://clinicaplus-api.up.railway.app"
    WEB_URL="https://clinica-plus-web.vercel.app"
    ;;
  *)
    echo "Usage: $0 [local|staging|prod]"
    exit 1
    ;;
esac

echo ""
echo "  ClinicaPlus — Health Check ($ENV)"
echo "  ==================================="
echo ""

echo -e "${BLUE}  API Endpoints${NC}"
check_url "Health" "$API_URL/health"
check_url "Auth login (public)" "$API_URL/api/auth/login" "401"
check_url "Auth refresh (no cookie)" "$API_URL/api/auth/refresh" "401"

echo ""
echo -e "${BLUE}  Protected Endpoints (should require auth)${NC}"
check_url "Pacientes (no auth)" "$API_URL/api/pacientes" "401"
check_url "Agendamentos (no auth)" "$API_URL/api/agendamentos" "401"
check_url "Dashboard (no auth)" "$API_URL/api/dashboard/stats" "401"

echo ""
echo -e "${BLUE}  Frontend${NC}"
if [[ "$ENV" == "local" ]]; then
  check_url "Vite dev server" "$WEB_URL" "200"
else
  check_url "Web app" "$WEB_URL" "200"
  check_url "Deep link (router)" "$WEB_URL/login" "200"
fi

echo ""
echo -e "${BLUE}  API Health Details${NC}"
HEALTH=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null || echo '{}')
echo "  $HEALTH"

echo ""
echo "  Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}  ✗ Health check failed.${NC}"
  exit 1
else
  echo -e "${GREEN}  ✓ All services healthy.${NC}"
fi
echo ""
