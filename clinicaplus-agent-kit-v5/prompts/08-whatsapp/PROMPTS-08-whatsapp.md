# Task: Sprint 08 — Módulo WhatsApp com Evolution API & n8n (TDD)

## METODOLOGIA: TEST-DRIVEN DEVELOPMENT
Cada passo segue o ciclo RED → GREEN → REFACTOR.
Nunca escreves código de produção sem um teste a falhar primeiro.
Se te apanhares a escrever código sem ter escrito o teste primeiro — PARA e volta atrás.

---

## LEITURA OBRIGATÓRIA — antes de qualquer código ou teste

1. `docs/CLAUDE.md`                                         → regras absolutas
2. `docs/CLAUDE-v2.md`                                      → regras v2
3. `docs/01-adr/ADR-012-whatsapp-evolution-n8n.md`          → decisão arquitectural
4. `docs/11-modules/MODULE-whatsapp.md`                     → spec completa (schema, services, endpoints)
5. `kit/skills/tdd/SKILL.md`                                → ciclo TDD obrigatório
6. `kit/skills/tdd/reference/ciclo-red-green-refactor.md`   → como executar o ciclo
7. `kit/skills/tdd/reference/mocks-externos.md`             → mocks para evolutionApi e n8nApi
8. `kit/skills/tdd/reference/cobertura-e-thresholds.md`     → thresholds obrigatórios
9. `kit/skills/whatsapp/SKILL.md`                           → regras e checklist do módulo
10. `kit/skills/whatsapp/reference/tdd-whatsapp.md`         → spec completa de todos os testes
11. `kit/skills/whatsapp/reference/conversa-state-machine.md` → máquina de estados
12. `kit/skills/whatsapp/reference/n8n-workflow-templates.md` → como construir templates
13. `kit/skills/whatsapp/reference/ui-automacoes.md`        → componentes React
14. `kit/skills/subscricoes/SKILL.md`                       → requirePlan('PRO') obrigatório
15. `kit/skills/SKILL-redis-bullmq.md`                      → jobs de lembrete e expiração
16. `kit/skills/SKILL-websocket.md`                         → eventos em tempo real

Confirma que leste os 16 ficheiros. Não avanças sem confirmar.

---

## PASSO 0 — Setup de testes (sem código de produção)

### 0a. Instalar dependências de teste

```bash
pnpm add -D vitest @vitest/coverage-v8 --filter=api   # se ainda não existir
```

### 0b. Criar ficheiros de mock

Cria estes 3 ficheiros (são helpers de teste — não são código de produção):

```
apps/api/src/test/mocks/evolutionApi.mock.ts
apps/api/src/test/mocks/n8nApi.mock.ts
apps/api/src/test/mocks/prisma.mock.ts  (verificar se já existe — não recriar)
```

Usa exactamente os padrões de `kit/skills/tdd/reference/mocks-externos.md`.

### 0c. Verificar vitest.config.ts

Confirma que `apps/api/vitest.config.ts` tem os thresholds de coverage para `src/services/wa-*`.
Se não existir, criar com a configuração de `kit/skills/tdd/reference/cobertura-e-thresholds.md`.

**Checkpoint 0:**
```bash
pnpm test --run --filter=api   # deve correr 0 testes — sem erros de setup
```

---

## PASSO 1 — Migration e Schema (zero risco de regressão)

### 1a. Prisma schema

Adiciona ao `prisma/schema.prisma` os modelos de `docs/11-modules/MODULE-whatsapp.md` §1:
- enum `WaEstadoInstancia`
- enum `WaTipoAutomacao`
- enum `WaEstadoConversa`
- enum `WaDirecao`
- model `WaInstancia`
- model `WaAutomacao`
- model `WaConversa`
- model `WaMensagem`

Adiciona campo `origem String? @default("DIRECTO")` ao model `Paciente` existente.
Adiciona campo `canal String? @default("PRESENCIAL")` ao model `Agendamento` existente.

### 1b. Migration

```bash
pnpm prisma migrate dev --name whatsapp_module
pnpm prisma generate
```

**Checkpoint 1:**
```bash
pnpm typecheck --filter=api   # zero erros
```

---

## PASSO 2 — TDD: evolutionApi.ts

### RED: escreve os testes primeiro

Cria `apps/api/src/lib/evolutionApi.test.ts`:

```typescript
// Testes a implementar (RED — vão falhar porque evolutionApi.ts ainda não existe):
describe('evolutionApi.criarInstancia', () => {
  it('deve fazer POST /instance/create com parâmetros correctos', ...)
  it('deve incluir webhook URL e eventos correctos', ...)
  it('deve lançar erro se Evolution API retornar 4xx', ...)
});
describe('evolutionApi.enviarTexto', () => {
  it('deve fazer POST /message/sendText/{instanceName}', ...)
  it('deve incluir delay de 1200ms', ...)
});
describe('evolutionApi.estadoConexao', () => {
  it('deve retornar estado "open" quando conectado', ...)
  it('deve retornar estado "close" quando desconectado', ...)
});
```

Usa `vi.mock('axios')` para mockar as chamadas HTTP.

Confirma que os testes falham com `pnpm test --run --filter=api`.

### GREEN: implementa o mínimo

Cria `apps/api/src/lib/evolutionApi.ts` exactamente como em
`docs/11-modules/MODULE-whatsapp.md` §4.

Confirma: `pnpm test --run --filter=api` — todos os testes do evolutionApi a VERDE.

### REFACTOR
- Extrair `makeEvoUrl(path)` helper
- Adicionar JSDoc aos métodos públicos

---

## PASSO 3 — TDD: n8nApi.ts + templates

### RED: testes primeiro

Cria `apps/api/src/lib/n8nApi.test.ts`:

```typescript
describe('n8nApi.criarWorkflow', () => {
  it('deve fazer POST /api/v1/workflows com template correcto', ...)
  it('deve activar o workflow imediatamente após criar', ...)
  it('deve retornar workflowId e webhookPath', ...)
  it('deve usar template MARCACAO_CONSULTA para tipo correcto', ...)
  it('deve usar template LEMBRETE_24H para tipo correcto', ...)
});
describe('n8nApi.desactivar', () => {
  it('deve fazer POST /api/v1/workflows/:id/deactivate', ...)
});
```

Cria `apps/api/src/lib/n8n-templates/marcacao.template.test.ts`:

```typescript
describe('templateMarcacao', () => {
  it('deve incluir webhookPath com slug da clínica', ...)
  it('deve incluir URL correcta para cada endpoint /fluxo/*', ...)
  it('deve incluir API key nos headers de cada nó HTTP', ...)
  it('deve incluir nó de resposta 200 ao webhook', ...)
  it('deve filtrar mensagens fromMe=true', ...)
});
```

Confirma que falham.

### GREEN: implementa

Cria `apps/api/src/lib/n8nApi.ts` — `docs/11-modules/MODULE-whatsapp.md` §5.
Cria `apps/api/src/lib/n8n-templates/index.ts`.
Copia `kit/skills/whatsapp/resources/marcacao.template.ts` para o projecto.
Cria os restantes templates: `lembrete-24h`, `lembrete-2h`, `confirmacao`, `boas-vindas`
seguindo os padrões de `kit/skills/whatsapp/reference/n8n-workflow-templates.md`.

Confirma: todos os testes de n8nApi e templates a VERDE.

---

## PASSO 4 — TDD: wa-instancia.service.ts

### RED: escreve todos os testes do describe

Cria `apps/api/src/services/wa-instancia.service.test.ts` com TODOS os casos
de `kit/skills/whatsapp/reference/tdd-whatsapp.md` secção "wa-instancia.service.ts".

Não implementes nada ainda. Confirma que todos falham.

### GREEN: implementa o service

Cria `apps/api/src/services/wa-instancia.service.ts` com:
- `criar(clinicaId, userId)` — cria instância na Evolution API + regista no DB
- `processarQrCode(clinicaId, qrBase64)` — actualiza DB + emite WebSocket
- `processarConexao(clinicaId, state)` — actualiza estado + emite WebSocket
- `desligar(clinicaId, userId)` — logout na Evolution API + actualiza DB

Implementa método a método — após cada método, verifica que os seus testes ficam a verde
antes de avançar para o próximo.

### REFACTOR
- Extrair `getInstanciaOrThrow(clinicaId)` helper interno
- Verificar que coverage de `wa-instancia.service.ts` ≥ 85%

**Checkpoint 4:**
```bash
pnpm test --run --filter=api -- wa-instancia
pnpm test --run --coverage --filter=api -- wa-instancia
```

---

## PASSO 5 — TDD: wa-automacao.service.ts

### RED → GREEN → REFACTOR

Segue o mesmo ciclo do Passo 4.
Spec de testes: `kit/skills/whatsapp/reference/tdd-whatsapp.md` secção "wa-automacao.service.ts".

Implementa:
- `activar(automacaoId, clinicaId, userId)` — cria workflow n8n + actualiza DB + auditoria
- `desactivar(automacaoId, clinicaId, userId)` — desactiva workflow + actualiza DB

**Atenção ao teste crítico:** "deve marcar automacao.ativo=false mesmo se n8n estiver em baixo"
→ `n8nApi.desactivar` deve ter `.catch(() => {})` — o DB é actualizado mesmo assim.

---

## PASSO 6 — TDD: wa-conversa.service.ts (a parte mais complexa)

### RED — escreve TODOS os testes das 5 etapas

Cria `apps/api/src/services/wa-conversa.service.test.ts` com TODOS os casos
de `kit/skills/whatsapp/reference/tdd-whatsapp.md` secção "wa-conversa.service.ts".

São ~20 testes. Escreve-os todos antes de implementar qualquer código.

Confirma: todos falham (RED).

### GREEN — implementa etapa por etapa

Implementa cada método, verificando que os seus testes ficam verdes antes de avançar:

1. `etapaInicio` → testes verdes → avança
2. `etapaEspecialidade` → testes verdes → avança
3. `etapaMedico` → testes verdes → avança
4. `etapaHorario` → testes verdes → avança
5. `etapaConfirmar` → testes verdes

Lê `kit/skills/whatsapp/reference/conversa-state-machine.md` antes de implementar
o tratamento de erros e reintentos.

### REFACTOR
- Extrair `obterOuCriarPaciente()` como função pura testável
- Extrair `tratarRespostaInvalida()` como função pura testável
- Extrair `formatarMensagemLista()` helper

**Checkpoint 6:**
```bash
pnpm test --run --filter=api -- wa-conversa
# Deve ter ≥ 20 testes a verde
pnpm test --run --coverage --filter=api -- wa-conversa
# coverage wa-conversa.service.ts ≥ 85%
```

---

## PASSO 7 — TDD: wa-webhook.service.ts

### RED → GREEN → REFACTOR

Spec de testes: secção "wa-webhook.service.ts" em `tdd-whatsapp.md`.

Atenção especial aos testes de HMAC:
- "deve rejeitar payload sem assinatura HMAC" → retorna 401
- "deve rejeitar payload com assinatura HMAC inválida" → retorna 401

O middleware `verificarHmacEvolution` deve ser testado em separado dos testes de integração.

---

## PASSO 8 — TDD: Rotas (integration tests com supertest)

### RED: escreve todos os testes de rota

Cria `apps/api/src/routes/whatsapp.test.ts` com os testes de integração
de `kit/skills/whatsapp/reference/tdd-whatsapp.md` secção "Rotas".

Usa `supertest` com um servidor Express de teste (não o servidor real).
Mock dos services (não da DB) neste nível.

### GREEN: implementa as rotas

Cria `apps/api/src/routes/whatsapp.ts` com TODAS as rotas de
`docs/11-modules/MODULE-whatsapp.md` §8.

Garante:
- `requirePlan('PRO')` em rotas de gestão (instância + automações)
- `requirePermission('whatsapp', 'manage')` em rotas de escrita
- `apiKeyAuth` nos endpoints `/fluxo/*` (não JWT)
- `verificarHmacEvolution` no endpoint `/webhook`

Regista as rotas em `apps/api/src/app.ts`:
```typescript
app.use('/api/whatsapp', whatsappRouter);
```

---

## PASSO 9 — TDD: Jobs BullMQ

Cria `apps/worker/src/jobs/wa-lembrete.job.test.ts` e `wa-expirar-conversas.job.test.ts`.

```typescript
// wa-lembrete.job — testes:
it('deve enfileirar lembrete 24h para agendamentos de amanhã', ...)
it('deve enfileirar lembrete 2h para agendamentos daqui a 2h', ...)
it('deve ignorar agendamentos de clínicas sem automação activa', ...)
it('deve ignorar pacientes sem número WhatsApp', ...)

// wa-expirar-conversas.job — testes:
it('deve expirar conversas sem resposta há mais de 24h', ...)
it('deve não afectar conversas CONCLUIDAS ou AGUARDA_INPUT', ...)
```

Implementa os jobs após os testes estarem a RED.

Adiciona ao scheduler do worker:
```typescript
agenda.every('0 7 * * *',  'wa-lembrete-24h',       {}, { timezone: 'Africa/Luanda' });
agenda.every('0 * * * *',  'wa-expirar-conversas',  {}, { timezone: 'Africa/Luanda' });
// Lembrete 2h: job a cada 30min — filtra agendamentos na janela [1h45, 2h15]
agenda.every('*/30 * * * *', 'wa-lembrete-2h',      {}, { timezone: 'Africa/Luanda' });
```

---

## PASSO 10 — UI com component tests

### RED: testes de componente primeiro

Cria `apps/web/src/pages/configuracoes/WhatsappPage.test.tsx`:
```typescript
// Spec de `kit/skills/whatsapp/reference/tdd-whatsapp.md` secção "WhatsappPage.tsx"
it('deve mostrar QR code quando estado=AGUARDA_QR', ...)
it('deve mostrar badge verde CONECTADO quando estado=CONECTADO', ...)
it('deve mostrar toggles para os 5 tipos de automação', ...)
it('deve mostrar campos de config ao activar automação', ...)
it('deve actualizar estado QR em tempo real via WebSocket', ...)
```

### GREEN: implementa os componentes

Cria os componentes seguindo `kit/skills/whatsapp/reference/ui-automacoes.md`:
- `apps/web/src/pages/configuracoes/WhatsappPage.tsx`
- `apps/web/src/components/wa/WaConexaoCard.tsx`
- `apps/web/src/components/wa/WaAutomacaoCard.tsx`
- `apps/web/src/components/wa/WaActividadeRecente.tsx`

Adiciona rota `/configuracoes/whatsapp` ao router.

---

## CHECKPOINT FINAL — tudo junto

```bash
pnpm typecheck                        # zero erros em todos os packages
pnpm test --run                       # todos os testes a verde
pnpm test --run --coverage --filter=api
# Verificar:
# wa-instancia.service: ≥ 85% lines
# wa-automacao.service: ≥ 85% lines
# wa-conversa.service:  ≥ 85% lines
# wa-webhook.service:   ≥ 85% lines
pnpm lint                             # zero warnings
```

Verificações manuais:
- [ ] `POST /api/whatsapp/instancias` com plano BASICO → 402 PLAN_UPGRADE_REQUIRED
- [ ] `POST /api/whatsapp/instancias` com plano PRO → 201 + qrCode presente
- [ ] `POST /api/whatsapp/webhook` sem HMAC → 401
- [ ] `POST /api/whatsapp/webhook` com HMAC válido → 200
- [ ] `POST /api/whatsapp/fluxo/inicio` com JWT → 401 (só aceita API key)
- [ ] `POST /api/whatsapp/fluxo/inicio` com API key válida → 200
- [ ] `/configuracoes/whatsapp` renderiza sem erros na consola
- [ ] Toggle de automação desactivado se instância não está CONECTADA
- [ ] Actividade recente actualiza em tempo real (WebSocket)

---

## SE ENCONTRARES CONFLITOS

Se `apps/api/src/app.ts` já tiver registo de rotas `/api/whatsapp` → PARA e reporta.
Se o scheduler do worker usar biblioteca diferente de `agenda` → PARA e reporta.
Se `prisma.agendamento` não tiver campo `canal` → PARA antes de adicionar (migration necessária).
Em todos os casos: adaptas o novo ao existente. Nunca o contrário.

**Regra TDD final:** se um teste passa sem que tenhas escrito código para ele,
ou se um teste falha por razão de sintaxe em vez de comportamento,
resolve antes de avançar.
