#!/usr/bin/env bash
# check-redis.sh — verificar ligação Redis + estado das filas BullMQ
set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
FAILED=0

echo "=== ClinicaPlus v2 — Redis Check ==="

# Carregar REDIS_URL
[[ -z "${REDIS_URL:-}" ]] && [[ -f "apps/api/.env" ]] && export $(grep -E "^REDIS_URL=" apps/api/.env | xargs) 2>/dev/null || true
[[ -z "${REDIS_URL:-}" ]] && fail "REDIS_URL não definido" && exit 1
ok "REDIS_URL encontrado"

# Testar via node
node --input-type=module << 'EOF'
import Redis from 'ioredis';
const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
r.on('error', (e) => { console.error('\x1b[31m✗\x1b[0m Redis:', e.message); process.exit(1); });
r.on('ready', async () => {
  console.log('\x1b[32m✓\x1b[0m Redis conectado');
  const filas = ['cp:emails','cp:reminders','cp:webhooks','cp:reports'];
  for (const q of filas) {
    const [wait, active, failed, delayed] = await Promise.all([
      r.llen(`bull:${q}:wait`),
      r.llen(`bull:${q}:active`),
      r.llen(`bull:${q}:failed`),
      r.zcard(`bull:${q}:delayed`),
    ]);
    const status = failed > 0 ? '\x1b[33m⚠\x1b[0m' : ' ';
    console.log(`  ${status} ${q}: wait=${wait} active=${active} delayed=${delayed} failed=${failed}`);
  }
  r.disconnect();
});
EOF

echo ""
[[ $FAILED -eq 0 ]] && echo -e "${GREEN}Redis OK${NC}" || { echo -e "${RED}Falhou${NC}"; exit 1; }
