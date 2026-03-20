# ClinicaPlus v2 — Sequência de Prompts

**Antes de começar:**
```bash
pnpm test --run && pnpm typecheck && pnpm lint   # tudo verde
bash scripts/health-check.sh prod                # API prod saudável
git checkout -b feat/v2-sprint-1                 # branch limpa
```

---

## Índice de Sprints

| Sprint | Ficheiro | Prompts | Dependência |
|--------|---------|---------|------------|
| 1 — Infraestrutura | `01-infra/PROMPTS-01-infra.md` | 3 | nenhuma |
| 2 — Real-Time | `02-realtime/PROMPTS-02-realtime.md` | 2 | Sprint 1 |
| 3+4 — Financeiro | `03-financeiro/PROMPTS-03-fin.md` | 5 | Sprint 1 |
| 5 — Plataforma | `04-plataforma/PROMPTS-04-plat.md` | 3 | Sprint 3 |
| 6 — RBAC | `05-rbac/PROMPTS-05-rbac.md` | 2 | Sprint 3 |
| 7 — Qualidade | `06-qualidade/PROMPTS-06-qual.md` | 2 | todos |

**Total: 17 prompts — 6 sprints — ~7 semanas de implementação**

---

## Checkpoint Global Entre Sprints

```bash
# Correr entre cada sprint antes de fazer merge para main:
pnpm test --run             # zero falhas
pnpm typecheck              # zero erros TypeScript
pnpm lint                   # zero warnings
bash scripts/check-redis.sh # Redis conectado, filas sem failed jobs
curl https://api.clinicaplus.ao/health   # "status": "ok"
git push origin main && # aguardar CI verde
```
