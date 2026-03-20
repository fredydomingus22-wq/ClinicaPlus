# ADR-011 — Estratégia de Billing e Gestão de Subscrições

**Data:** 2026-03-13
**Status:** ACEITE
**Autores:** ClinicaPlus Core Team

---

## Contexto

O ClinicaPlus tem três planos (BASICO, PRO, ENTERPRISE) com limites e features distintos
documentados em ADR-010. Até agora, o campo `clinica.plano` é um enum estático — não existe
ciclo de vida, histórico de pagamentos, gestão de upgrades/downgrades, nem enforcement
automático por expiração.

Precisamos decidir:
1. Como gerir o ciclo de vida da subscrição (trial → activo → cancelado → expirado)
2. Se integramos gateway de pagamento externo (Stripe/Multicaixa Express) ou billing manual
3. Como enforçar limites em cada camada (API, UI, jobs)
4. O que acontece quando uma clínica não paga (grace period, degradação, bloqueio)

---

## Decisão

### 1. Modelo de billing: híbrido manual + automático futuro

**Fase 1 (actual):** Billing manual com gestão pelo Super Admin do ClinicaPlus.
- Super Admin actualiza o plano e datas de validade via painel interno
- Clínica recebe invoice por email (gerada pelo módulo financeiro existente)
- Pagamento confirmado manualmente (transferência bancária, Multicaixa)
- Razão: Angola não tem Stripe. Multicaixa Express API ainda em rollout limitado.
  Integração automática de pagamentos adicionada em v3 quando a infra bancária estiver madura.

**Fase 2 (v3):** Integração Multicaixa Express para renovações automáticas.

### 2. Nova tabela `Subscricao` separada do campo `clinica.plano`

`clinica.plano` mantém-se como cache do plano activo para queries rápidas.
A fonte de verdade é a tabela `Subscricao` com histórico completo.

### 3. Grace period de 7 dias após expiração

Após expiração da subscrição:
- Dias 1-7: aviso persistente no painel, funcionalidades mantidas (grace period)
- Dia 8+: downgrade automático para BASICO com dados preservados
- Dia 30+: conta suspensa (só leitura) — dados nunca eliminados

### 4. Feature enforcement em três camadas

1. **Middleware de API** — `requirePlan()` bloqueia endpoints PRO/ENTERPRISE
2. **UI** — componente `<PlanGate>` mostra upgrade prompt em vez do conteúdo
3. **Jobs** — worker verifica plano antes de executar tarefas agendadas

---

## Alternativas consideradas

**Stripe directamente**
- Prós: automação total, webhooks de pagamento, portal de billing pronto
- Contras: não aceita pagamentos angolanos, requer conta bancária internacional,
  complexidade de integração desnecessária para o mercado actual
- Decisão: descartado para Fase 1

**Manter apenas `clinica.plano` sem tabela de subscrição**
- Prós: simples, sem migration
- Contras: sem histórico, sem gestão de expiração, impossível auditar mudanças de plano
- Decisão: descartado — auditabilidade é requisito de negócio

**Downgrade imediato ao expirar (sem grace period)**
- Prós: enforcement limpo
- Contras: má experiência, clínicas perdem acesso por atraso de pagamento legítimo
- Decisão: descartado — grace period de 7 dias é obrigatório

---

## Consequências

**Fica mais fácil:**
- Auditar histórico completo de planos de cada clínica
- Implementar notificações de renovação (D-30, D-7, D-1, D+1)
- Migrar para billing automático em v3 sem mudar a estrutura

**Fica mais difícil:**
- Queries que precisam do plano activo têm de consultar `Subscricao` ou usar o cache em `clinica.plano`
- Super Admin tem de confirmar pagamentos manualmente (aceite para Fase 1)

**Trade-offs aceites:**
- Billing manual introduz fricção operacional — mitigado por painel interno do Super Admin
- `clinica.plano` pode ficar dessincronizado do `Subscricao` activo — um job nocturno reconcilia
