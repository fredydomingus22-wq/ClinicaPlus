# ClinicaPlus

SaaS multi-tenant para gestão de clínicas privadas em Angola.
Desenvolvido com Node.js (Express), React, Prisma e PostgreSQL.

## Layout do Monorepo
- `apps/api`: Backend API (Express + Prisma)
- `apps/web`: Frontend Web (React + Vite)
- `packages/types`: Tipos partilhados (Zod)
- `packages/ui`: Biblioteca de componentes partilhada
- `packages/utils`: Utilitários partilhados

## Monitorização e Observabilidade
O sistema inclui monitorização avançada para garantir estabilidade em produção:

- **Logs Estruturados**: Logs em formato JSON (Pino) com contexto de utilizador e clínica.
- **Health Check**: Endpoint `/health` com verificação de latência da base de dados e uptime.
- **Métricas Internas**: Endpoint `/metrics` (protegido por token) para contagem de pedidos e erros 5xx.
- **Alertas Críticos**: Notificações automáticas por email para erros 500 via Resend.
- **Incident Runbooks**: Documentação de procedimentos de emergência em `docs/10-runbooks/RUNBOOK-incidents.md`.

## Rollback e Manutenção
- Scripts de rollback disponíveis em `scripts/rollback.sh`.
- Verificação de saúde: `bash scripts/health-check.sh prod`.

## Licença
Privado — ClinicaPlus Angola.
