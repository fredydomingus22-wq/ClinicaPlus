# Task: Sprint 08 — Módulo WhatsApp (Evolution API + n8n) com TDD

## METODOLOGIA OBRIGATÓRIA: TEST-DRIVEN DEVELOPMENT
Ciclo: RED (teste falha) → GREEN (mínimo código) → REFACTOR (limpar)
NUNCA escreves código de produção sem um teste a falhar primeiro.

---

## LEITURA OBRIGATÓRIA — confirma que leste todos antes de avançar

1. `docs/CLAUDE.md`                                          → regras absolutas do projecto
2. `docs/01-adr/ADR-012-whatsapp-evolution-n8n.md`           → decisões arquitecturais
3. `docs/11-modules/MODULE-whatsapp.md`                      → spec completa (schema, services, endpoints, jobs, UI)
4. `kit/skills/whatsapp/SKILL.md`                            → regras e checklist
5. `kit/skills/whatsapp/reference/conversa-state-machine.md` → máquina de estados e etapas
6. `kit/skills/whatsapp/reference/tdd-specs.md`              → ~50 casos de teste a implementar
7. `kit/skills/tdd/SKILL.md`                                 → ciclo TDD obrigatório
8. `kit/skills/tdd/reference/mocks-externos.md`              → mocks evolutionApi, n8nApi, Prisma
9. `kit/skills/SKILL-redis-bullmq.md`                        → jobs de lembrete
10. `kit/skills/SKILL-websocket.md`                          → publishEvent para notificações

Confirma que leste todos com: "Li os 10 ficheiros. A avançar para Passo 0."

---

## PASSO 0 — Setup TDD (sem código de produção)

### 0a. Dependências de teste
```bash
pnpm add -D vitest @vitest/coverage-v8 --filter=api   # se ainda não existir
pnpm add -D @testing-library/react @testing-library/user-event --filter=web
```

### 0b. Criar ficheiros de mock
Cria exactamente estes 3 ficheiros usando os padrões de `kit/skills/tdd/reference/mocks-externos.md`:
```
apps/api/src/test/mocks/evolutionApi.mock.ts
apps/api/src/test/mocks/n8nApi.mock.ts
apps/api/src/test/mocks/prisma.mock.ts   ← verificar se já existe antes de criar
```

### 0c. vitest.config.ts
Verificar se `apps/api/vitest.config.ts` tem thresholds para `src/services/wa-*` (≥ 85% lines).
Se não, adicionar.

### Checkpoint 0
```bash
pnpm test --run --filter=api   # deve correr 0 testes sem erros de setup
```
Se houver erros de configuração, resolve-os ANTES de avançar.

---

## PASSO 1 — Migration e Schema (risco zero)

### 1a. Schema Prisma
Adiciona ao `prisma/schema.prisma` exactamente os modelos de `MODULE-whatsapp.md §1`:
- `enum WaEstadoInstancia` (4 valores)
- `enum WaTipoAutomacao` (5 valores)
- `enum WaEstadoConversa` (5 valores)
- `enum WaDirecao` (2 valores)
- `model WaInstancia` com TODOS os campos e índices especificados
- `model WaAutomacao` com `@@unique([instanciaId, tipo])`
- `model WaConversa` com `@@unique([instanciaId, numeroWhatsapp])` e `@@index([ultimaMensagemEm])`
- `model WaMensagem`

Adiciona ao model `Paciente` existente: `origem String? @default("DIRECTO")`
Adiciona ao model `Agendamento` existente: `canal String? @default("PRESENCIAL")`

### 1b. Aplicar migration
```bash
pnpm prisma migrate dev --name whatsapp_module
pnpm prisma generate
```

### Checkpoint 1
```bash
pnpm typecheck --filter=api   # zero erros
```
PARA se houver erros TypeScript no schema. Não avançar com erros.

---

## PASSO 2 — TDD: lib/evolutionApi.ts

### RED — escreve os testes PRIMEIRO
Cria `apps/api/src/lib/evolutionApi.test.ts`:
```typescript
// Usa vi.mock('axios') para mockar chamadas HTTP
// Implementa TODOS os testes de "evolutionApi" de tdd-specs.md:
// - criarInstancia: POST correcto, webhook URL, erro 4xx
// - enviarTexto: path correcto, delay: 1200 presente
// - estadoConexao: retorna state correcto
```
Confirma que FALHAM: `pnpm test --run --filter=api -- evolutionApi`

### GREEN — implementa o mínimo
Cria `apps/api/src/lib/evolutionApi.ts` exactamente como em `MODULE-whatsapp.md §4`.
Confirma que PASSAM: `pnpm test --run --filter=api -- evolutionApi`

### REFACTOR
- Extrair `makeEvoRequest()` helper para reduzir repetição
- Zero mudança no comportamento — testes continuam verdes

---

## PASSO 3 — TDD: lib/n8nApi.ts + templates

### RED — testes primeiro
Cria `apps/api/src/lib/n8nApi.test.ts` e `apps/api/src/lib/n8n-templates/marcacao.template.test.ts`:
```typescript
// n8nApi: criarWorkflow chama POST + activate, retorna workflowId e webhookPath
// templateMarcacao: contém webhookPath correcto, URL dos endpoints /fluxo/*, API key nos headers
```
Confirma que FALHAM.

### GREEN — implementa
Cria `apps/api/src/lib/n8nApi.ts` como em `MODULE-whatsapp.md §5`.
Cria `apps/api/src/lib/n8n-templates/index.ts` (registo TEMPLATES[tipo]).
Cria `apps/api/src/lib/n8n-templates/marcacao.template.ts` (ver arquivo na skill).
Cria os restantes 4 templates: `lembrete-24h`, `lembrete-2h`, `confirmacao`, `boas-vindas`
  — seguindo o padrão de marcacao.template.ts mas com lógica simplificada.
Confirma que PASSAM.

---

## PASSO 4 — TDD: wa-instancia.service.ts

### RED — todos os testes da secção "wa-instancia.service.ts" de tdd-specs.md
Cria `apps/api/src/services/wa-instancia.service.test.ts` com TODOS os casos.
Confirma que FALHAM.

### GREEN — implementa método a método
Cria `apps/api/src/services/wa-instancia.service.ts` como em `MODULE-whatsapp.md §6`.
Implementa método a método, verificando que os testes ficam verdes antes de avançar:
  1. `criar()` → testes verdes → próximo
  2. `processarQrCode()` → testes verdes → próximo
  3. `processarConexao()` → testes verdes → próximo
  4. `desligar()` → testes verdes

### Checkpoint 4
```bash
pnpm test --run --filter=api -- wa-instancia
pnpm test --run --coverage --filter=api -- wa-instancia
# wa-instancia.service: ≥ 85% lines
```

---

## PASSO 5 — TDD: wa-automacao.service.ts

Segue exactamente o mesmo ciclo do Passo 4.
Testes: secção "wa-automacao.service.ts" de tdd-specs.md.
Implementação: `MODULE-whatsapp.md §6 wa-automacao.service.ts`.

ATENÇÃO ao teste crítico:
"deve marcar ativo=false mesmo se n8n estiver em baixo"
→ A implementação DEVE ter `.catch(err => { logger.warn(...) })` no `n8nApi.desactivar()`

### Checkpoint 5
```bash
pnpm test --run --filter=api -- wa-automacao
# ≥ 85% lines
```

---

## PASSO 6 — TDD: wa-conversa.service.ts (mais complexo)

### RED — escreve TODOS os ~25 testes antes de qualquer implementação
Cria `apps/api/src/services/wa-conversa.service.test.ts` com TODOS os casos
de tdd-specs.md secção "wa-conversa.service.ts".
Confirma que TODOS FALHAM antes de avançar.

### GREEN — implementa etapa a etapa
Cria `apps/api/src/services/wa-conversa.service.ts`.
Implementa cada método, com testes verdes antes de passar ao seguinte:
  1. `obter()`
  2. `etapaInicio()` — lê `conversa-state-machine.md` antes
  3. `etapaEspecialidade()` — incluindo `tratarInputInvalido()`
  4. `etapaMedico()`
  5. `etapaHorario()`
  6. `etapaConfirmar()` — incluindo `obterOuCriarPaciente()`

### REFACTOR
- Extrair `obterOuCriarPaciente()` como função pura testável em separado
- Extrair `tratarInputInvalido()` como função pura reutilizável
- Extrair `formatSlotPtAO()` para lib/utils.ts

### Checkpoint 6
```bash
pnpm test --run --filter=api -- wa-conversa
# ≥ 25 testes verdes
# ≥ 85% lines coverage
```

---

## PASSO 7 — TDD: wa-webhook.service.ts + middleware HMAC

### RED → GREEN → REFACTOR
Testes: secção "wa-webhook.service.ts" e "verificarHmacEvolution" de tdd-specs.md.
Implementação: `MODULE-whatsapp.md §7`.

ATENÇÃO: `verificarHmacEvolution` é um middleware Express — testá-lo em separado
com req/res mocks, não via supertest.

---

## PASSO 8 — Rotas (integration tests com supertest)

### RED — todos os testes de rota de tdd-specs.md
Cria `apps/api/src/routes/whatsapp.test.ts`.
Usa supertest com Express de teste. Mocka os SERVICES (não a DB).
Confirma que TODOS FALHAM.

### GREEN — implementa as rotas
Cria `apps/api/src/routes/whatsapp.ts` com TODAS as rotas de `MODULE-whatsapp.md §8`.

GARANTE (verificar linha a linha):
- `requirePlan('PRO')` em `/instancias` e `/automacoes`
- `requirePermission('whatsapp', 'manage')` nas rotas de escrita
- `apiKeyAuth` (não JWT) nos endpoints `/fluxo/*`
- `verificarHmacEvolution` no endpoint `/webhook`

Regista as rotas em `apps/api/src/app.ts`:
```typescript
import whatsappRouter from './routes/whatsapp';
app.use('/api/whatsapp', whatsappRouter);
```

### Checkpoint 8
```bash
pnpm test --run --filter=api -- routes/whatsapp
```

---

## PASSO 9 — Jobs BullMQ

Cria `apps/worker/src/jobs/wa-lembrete.job.test.ts` com:
```typescript
it('deve enfileirar/executar lembrete para agendamentos de amanhã com instância CONECTADA')
it('deve ignorar clínicas sem automação LEMBRETE_24H activa')
it('deve ignorar pacientes sem número WhatsApp')
```

Implementa `apps/worker/src/jobs/wa-lembrete.job.ts` como em `MODULE-whatsapp.md §9`.
Implementa `apps/worker/src/jobs/wa-expirar-conversas.job.ts`.

Adiciona ao scheduler do worker:
```typescript
agenda.every('0 7 * * *',  'wa-lembrete-24h',       {}, { timezone: 'Africa/Luanda' });
agenda.every('0 */2 * * *','wa-lembrete-2h',         {}, { timezone: 'Africa/Luanda' });
agenda.every('0 * * * *',  'wa-expirar-conversas',   {}, { timezone: 'Africa/Luanda' });
```

---

## PASSO 10 — UI React (component tests)

### RED — component tests primeiro
Cria `apps/web/src/pages/configuracoes/WhatsappPage.test.tsx` com
TODOS os casos de tdd-specs.md secção "WhatsappPage.tsx".
Confirma que FALHAM.

### GREEN — implementa componentes
Cria seguindo `MODULE-whatsapp.md §(UI)` e `kit/skills/whatsapp/reference/ui-painel.md`:
- `apps/web/src/pages/configuracoes/WhatsappPage.tsx`
- `apps/web/src/components/wa/WaConexaoCard.tsx`
- `apps/web/src/components/wa/WaAutomacaoCard.tsx`
- `apps/web/src/components/wa/WaActividadeRecente.tsx`

Envolve toda a página com `<PlanGate planoMinimo="PRO">`.
Adiciona rota `/configuracoes/whatsapp` ao router.

---

## CHECKPOINT FINAL — obrigatório antes de considerar completo

```bash
pnpm typecheck                        # zero erros em TODOS os packages
pnpm test --run                       # TODOS os testes verdes
pnpm test --run --coverage --filter=api
# wa-instancia.service:  ≥ 85% lines
# wa-automacao.service:  ≥ 85% lines
# wa-conversa.service:   ≥ 85% lines
# wa-webhook.service:    ≥ 85% lines
pnpm lint                             # zero warnings
```

### Checklist manual obrigatório

**Database:**
- [ ] `pnpm prisma db push --preview-feature` sem erros
- [ ] Campos `origem` (Paciente) e `canal` (Agendamento) visíveis no Prisma Studio

**Segurança:**
- [ ] `POST /api/whatsapp/webhook` sem HMAC → 401
- [ ] `POST /api/whatsapp/webhook` com HMAC inválido → 401
- [ ] `POST /api/whatsapp/fluxo/inicio` com JWT → 401
- [ ] `POST /api/whatsapp/fluxo/inicio` com API key válida → 200
- [ ] `POST /api/whatsapp/instancias` com plano BASICO → 402

**Funcionalidade:**
- [ ] `POST /api/whatsapp/instancias` PRO → 201 com qrCode no body
- [ ] `GET /api/whatsapp/instancias/estado` → retorna estado actual
- [ ] `GET /api/whatsapp/automacoes` → retorna 5 tipos com estado e config
- [ ] `/configuracoes/whatsapp` renderiza sem erros na consola do browser
- [ ] Toggle de automação disabled quando instância não CONECTADA

**Qualidade:**
- [ ] Zero `console.log` no código commitado
- [ ] Zero `any` TypeScript sem comentário justificativo
- [ ] Zero `it.only` ou `test.only` nos ficheiros de teste

---

## SE ENCONTRARES CONFLITOS

- Se `agendamentosService.create()` não aceita campo `canal` → PARA e reporta
- Se o scheduler do worker usa biblioteca diferente de `agenda` → PARA e reporta
- Se `apiKeyAuth` middleware não existe ainda → PARA e reporta qual middleware de auth por API key existe
- Se `publishEvent()` não existe ou tem assinatura diferente → PARA e reporta

Regra universal: **adaptas o novo ao existente, nunca o contrário.**
