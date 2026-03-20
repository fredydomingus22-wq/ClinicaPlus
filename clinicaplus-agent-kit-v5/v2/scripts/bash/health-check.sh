#!/usr/bin/env bash
# health-check.sh — ClinicaPlus
# Uso: ./health-check.sh [dev|staging|prod]
# Exit: 0 = tudo OK, 1 = alguma falha

set -euo pipefail

ENV=${1:-dev}
PASS=0; FAIL=0; WARN=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}✗${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}⚠${NC} $1"; ((WARN++)); }

echo "══════════════════════════════════"
echo " ClinicaPlus Health Check — $ENV"
echo "══════════════════════════════════"

# ── API ──────────────────────────────────────────────────────────────────────
echo -e "\n[API]"
API_URL=${API_URL:-http://localhost:3000}

if curl -sf "$API_URL/health" > /tmp/health.json 2>/dev/null; then
  DB_STATUS=$(jq -r '.database // "unknown"' /tmp/health.json)
  REDIS_STATUS=$(jq -r '.redis // "unknown"' /tmp/health.json)

  [ "$DB_STATUS"    = "connected" ] && ok "Database: $DB_STATUS"    || fail "Database: $DB_STATUS"
  [ "$REDIS_STATUS" = "connected" ] && ok "Redis: $REDIS_STATUS"    || warn "Redis: $REDIS_STATUS (opcional)"
else
  fail "API não responde em $API_URL/health"
fi

# ── Evolution API ─────────────────────────────────────────────────────────────
echo -e "\n[Evolution API]"
EVO_URL=${EVOLUTION_API_URL:-}
EVO_KEY=${EVOLUTION_API_KEY:-}

if [ -z "$EVO_URL" ]; then
  warn "EVOLUTION_API_URL não configurado — a saltar"
else
  if curl -sf "$EVO_URL/manager/checkConnectionStatus" \
      -H "apikey: $EVO_KEY" > /dev/null 2>&1; then
    ok "Evolution API responde"
    # Contar instâncias conectadas
    INSTANCES=$(curl -sf "$EVO_URL/instance/fetchInstances" \
      -H "apikey: $EVO_KEY" 2>/dev/null | jq '[.[] | select(.state == "open")] | length' 2>/dev/null || echo "?")
    ok "Instâncias conectadas: $INSTANCES"
  else
    fail "Evolution API não responde em $EVO_URL"
  fi
fi

# ── n8n ───────────────────────────────────────────────────────────────────────
echo -e "\n[n8n]"
N8N_URL=${N8N_BASE_URL:-}
N8N_KEY=${N8N_API_KEY:-}

if [ -z "$N8N_URL" ]; then
  warn "N8N_BASE_URL não configurado — a saltar"
else
  if curl -sf "$N8N_URL/healthz" > /dev/null 2>&1; then
    ok "n8n responde"
    ACTIVE=$(curl -sf "$N8N_URL/api/v1/workflows?active=true" \
      -H "X-N8N-API-KEY: $N8N_KEY" 2>/dev/null | jq '.count // 0' 2>/dev/null || echo "?")
    ok "Workflows activos: $ACTIVE"
  else
    fail "n8n não responde em $N8N_URL"
  fi
fi

# ── Worker ────────────────────────────────────────────────────────────────────
echo -e "\n[Worker]"
if [ -n "$REDIS_URL" ]; then
  WAITING=$(redis-cli -u "$REDIS_URL" LLEN bull:wa-lembretes:wait 2>/dev/null || echo "?")
  FAILED=$(redis-cli -u "$REDIS_URL" LLEN bull:wa-lembretes:failed 2>/dev/null || echo "0")
  ok "Fila wa-lembretes: $WAITING em espera"
  [ "$FAILED" = "0" ] && ok "Fila wa-lembretes: sem falhas" || warn "Fila wa-lembretes: $FAILED falhadas"
else
  warn "REDIS_URL não configurado — a saltar verificação de filas"
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
echo -e "\n══════════════════════════════════"
echo -e " ✓ $PASS  ✗ $FAIL  ⚠ $WARN"
echo "══════════════════════════════════"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
