#!/usr/bin/env bash
# health-check.sh — ClinicaPlus v2
# Uso: ./health-check.sh [dev|staging|prod]
# Exit: 0 = OK, 1 = falha

set -euo pipefail
ENV=${1:-dev}
PASS=0; FAIL=0; WARN=0

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${G}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${R}✗${NC} $1"; ((FAIL++)); }
warn() { echo -e "${Y}⚠${NC} $1"; ((WARN++)); }

echo "════════════════════════════════════"
echo " ClinicaPlus Health Check — $ENV"
echo "════════════════════════════════════"

API_URL=${API_URL:-http://localhost:3001}

echo -e "\n[API]"
if curl -sf "$API_URL/health" > /tmp/cp_health.json 2>/dev/null; then
  DB=$(jq -r '.database // "unknown"' /tmp/cp_health.json)
  REDIS=$(jq -r '.redis // "unknown"' /tmp/cp_health.json)
  [ "$DB" = "connected" ]    && ok "Database: $DB"    || fail "Database: $DB"
  [ "$REDIS" = "connected" ] && ok "Redis: $REDIS"    || warn "Redis: $REDIS"
else
  fail "API não responde em $API_URL/health"
fi

echo -e "\n[Evolution API]"
EVO_URL=${EVOLUTION_API_URL:-}
if [ -z "$EVO_URL" ]; then
  warn "EVOLUTION_API_URL não configurado"
else
  if curl -sf "$EVO_URL/manager/checkConnectionStatus" -H "apikey: ${EVOLUTION_API_KEY:-}" > /dev/null 2>&1; then
    ok "Evolution API responde"
    CONN=$(curl -sf "$EVO_URL/instance/fetchInstances" -H "apikey: ${EVOLUTION_API_KEY:-}" 2>/dev/null \
      | jq '[.[] | select(.instance.state == "open")] | length' 2>/dev/null || echo "?")
    ok "Instâncias WA conectadas: $CONN"
  else
    fail "Evolution API não responde em $EVO_URL"
  fi
fi

echo -e "\n[n8n]"
N8N_URL=${N8N_BASE_URL:-}
if [ -z "$N8N_URL" ]; then
  warn "N8N_BASE_URL não configurado"
else
  if curl -sf "$N8N_URL/healthz" > /dev/null 2>&1; then
    ok "n8n responde"
    ACTIVE=$(curl -sf "$N8N_URL/api/v1/workflows?active=true" \
      -H "X-N8N-API-KEY: ${N8N_API_KEY:-}" 2>/dev/null | jq '.count // 0' 2>/dev/null || echo "?")
    ok "Workflows n8n activos: $ACTIVE"
  else
    fail "n8n não responde em $N8N_URL"
  fi
fi

echo -e "\n[Supabase Storage]"
API_URL_CHECK="${API_URL}/api/public/tema?domain=health-check-internal"
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$API_URL_CHECK" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Endpoint público de tema responde" || warn "Endpoint público de tema: $STATUS"

echo -e "\n════════════════════════════════════"
echo -e " ${G}✓${NC} $PASS  ${R}✗${NC} $FAIL  ${Y}⚠${NC} $WARN"
echo "════════════════════════════════════"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
