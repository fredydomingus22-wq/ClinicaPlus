# ClinicaPlus v2 — Agent Kit

**Pré-requisito:** v1 em produção. `pnpm test --run` verde. `bash scripts/health-check.sh prod` verde.

---

## Como Usar Este Kit

1. Lê `docs/CLAUDE-v2.md` (regras novas) antes de qualquer sprint
2. Para cada sprint, lê a SKILL correspondente antes de escrever código
3. Executa os prompts na ordem indicada — cada prompt tem uma verificação antes de avançar
4. Não saltares sprints — cada um tem dependências do anterior

---

## Estrutura

```
kit/
├── AGENT_KIT_v2.md                 ← este ficheiro
│
├── skills/
│   ├── SKILL-redis-bullmq.md       Redis, filas, workers, idempotência
│   ├── SKILL-websocket.md          Socket.io, rooms, pub/sub, real-time
│   ├── SKILL-financeiro.md         Faturas, pagamentos, seguros, relatórios
│   ├── SKILL-plataforma.md         API keys, webhooks, plan enforcement
│   └── SKILL-rbac.md               Permissões, cache, audit log
│
├── scripts/
│   ├── check-redis.sh              verificar Redis + estado das filas
│   ├── migrate-v2.sh               aplicar migrations v2 com validação
│   └── seed-planos.sh              seed dos limites por plano
│
└── prompts/
    ├── PROMPTS-v2.md               ← índice e sequência (ler primeiro)
    ├── 01-infra/
    │   └── PROMPTS-01-infra.md     Sprint 1: Redis + BullMQ + Worker
    ├── 02-realtime/
    │   └── PROMPTS-02-realtime.md  Sprint 2: Socket.io + badge
    ├── 03-financeiro/
    │   └── PROMPTS-03-fin.md       Sprint 3+4: Módulo Financeiro
    ├── 04-plataforma/
    │   └── PROMPTS-04-plat.md      Sprint 5: API Keys + Webhooks + Plans
    ├── 05-rbac/
    │   └── PROMPTS-05-rbac.md      Sprint 6: RBAC + Audit
    └── 06-qualidade/
        └── PROMPTS-06-qual.md      Sprint 7: Playwright + k6
```

---

## Sequência e Riscos

| Sprint | Tema | Prompts | Risco de Deploy |
|--------|------|---------|-----------------|
| 1 | Infraestrutura Assíncrona | 3 | Zero — novo processo paralelo |
| 2 | Real-Time | 2 | Zero — WS é adicional |
| 3 | Financeiro Core | 3 | Zero — novas tabelas |
| 4 | Financeiro Avançado | 2 | Zero |
| 5 | Plataforma | 3 | Baixo — migration + período de graça |
| 6 | RBAC | 2 | Médio — migration + seed (~3 min) |
| 7 | Qualidade | 2 | Zero |
| **Total** | | **17** | |
