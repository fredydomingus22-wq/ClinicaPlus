# Auditoria do Módulo WhatsApp — ClinicaPlus

Script de conformidade que verifica o módulo WhatsApp contra a especificação
em `docs/11-modules/MODULE-whatsapp.md` e retorna o que está em falta com
instruções de implementação para cada item.

---

## Instalação

Copia `audit-whatsapp.ts` para a pasta `scripts/` do teu monorepo:

```bash
cp audit-whatsapp.ts scripts/
```

Dependências necessárias (já devem existir no projecto):
```bash
pnpm add -D tsx --filter=api  # se ainda não tiveres
```

---

## Uso

### Auditoria completa
```bash
npx tsx scripts/audit-whatsapp.ts
```

### Apenas uma secção
```bash
npx tsx scripts/audit-whatsapp.ts --section=db       # Database & Schema
npx tsx scripts/audit-whatsapp.ts --section=be       # Backend
npx tsx scripts/audit-whatsapp.ts --section=jobs     # Jobs BullMQ
npx tsx scripts/audit-whatsapp.ts --section=fe       # Frontend
npx tsx scripts/audit-whatsapp.ts --section=sec      # Segurança
npx tsx scripts/audit-whatsapp.ts --section=tests    # Testes
```

### Output JSON (para CI/CD ou integração)
```bash
npx tsx scripts/audit-whatsapp.ts --json > audit-report.json
```

### Com servidor a correr (testes de endpoint ao vivo)
```bash
API_URL=https://api.clinicaplus.ao npx tsx scripts/audit-whatsapp.ts
```

---

## O que verifica

| Secção | Verificações |
|--------|-------------|
| **Database** | Enums (4), Models (4) com campos completos, índices, campos em Paciente/Agendamento, schema válido |
| **Backend** | Ficheiros obrigatórios (8), templates n8n (5), implementação evolutionApi (delay, timeout, interceptor), HMAC no webhook, etapas da conversa (5), guards nas rotas, variáveis de ambiente |
| **Jobs** | Ficheiros dos jobs, timezone Africa/Luanda, registo no scheduler |
| **Frontend** | Componentes (4), PlanGate, WebSocket events, toggles disabled, sem cores hardcoded, rota registada |
| **Segurança** | Webhook sem HMAC → 401, /fluxo com JWT → 401, clinicaId não vem do body (IDOR) |
| **Testes** | Ficheiros de teste (5), casos obrigatórios, typecheck, testes passam |

---

## Output de exemplo

```
══════════════════════════════════════════════════════════
  RELATÓRIO DE AUDITORIA — MÓDULO WHATSAPP
══════════════════════════════════════════════════════════

  Conformidade geral:  67%  ████████████░░░░░░░░

  ✓ Passou:    20
  ✗ Falhou:    8  (2 CRÍTICOS)
  ⚠ Aviso:     4

  ⚠ ITENS CRÍTICOS — RESOLVER IMEDIATAMENTE
  ─────────────────────────────────────────────────────

  [1] Verificação HMAC com crypto.timingSafeEqual no webhook handler
  ID: BE-WEBHOOK-HMAC  |  Ref: docs/11-modules/MODULE-whatsapp.md §7

  Problema: ⚠ CRÍTICO: Webhook sem verificação HMAC

  Como resolver:
  Em wa-webhook.service.ts, implementar:
  export function verificarHmacEvolution(req, res, next) {
    const signature = req.headers['x-evolution-signature'];
    ...
  }
```

---

## Exit codes

| Código | Significado |
|--------|------------|
| `0` | Tudo OK (ou apenas avisos) |
| `1` | Há itens CRÍTICOS em falta |
| `2` | Erro fatal no script |

---

## Integrar no CI/CD

```yaml
# .github/workflows/audit.yml
- name: Audit WhatsApp module
  run: npx tsx scripts/audit-whatsapp.ts --json > /tmp/audit.json
  continue-on-error: true

- name: Check for critical failures
  run: |
    CRITICAL=$(cat /tmp/audit.json | jq '.summary.critical')
    if [ "$CRITICAL" -gt "0" ]; then
      echo "❌ $CRITICAL item(s) crítico(s) em falta no módulo WhatsApp"
      exit 1
    fi
```
