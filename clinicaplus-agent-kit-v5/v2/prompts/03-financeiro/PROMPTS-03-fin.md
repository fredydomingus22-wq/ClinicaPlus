# Sprint 3+4 — Módulo Financeiro

**Skill:** `SKILL-financeiro.md` + `docs/11-modules/MODULE-financeiro.md`
**Risco:** Zero — novas tabelas e novas rotas. Nada existente muda.

---

## Prompt 3.1 — Schema + Migration + Types

```
Lê SKILL-financeiro.md.
Lê docs/DATABASE_SCHEMA_v2.md (migration_001).
Lê docs/11-modules/MODULE-financeiro.md (secções 2, 4).

1. Adiciona ao apps/api/prisma/schema.prisma:
   - Enums: EstadoFatura, TipoFatura, MetodoPagamento, EstadoSeguro
   - Models: Fatura, ItemFatura, Pagamento, SeguroPagamento
   - Todos os @@index definidos no schema
   - Relações de volta em Agendamento, Paciente, Medico (campos de relação)

2. Corre a migration:
   pnpm db:migrate
   → Nome sugerido: "add_financial_module"
   
   Se falhar: verificar DIRECT_URL (migrations precisam do port 5432, não 6543)

3. Regenera o Prisma client:
   pnpm db:generate

4. Adiciona schemas Zod em packages/types/src/schemas/:
   FaturaCreateSchema, FaturaUpdateSchema
   PagamentoCreateSchema, SeguroUpdateSchema
   FaturaDTO, ItemFaturaDTO, PagamentoDTO

5. Corre: pnpm build --filter=@clinicaplus/types && pnpm typecheck

Verifica:
   pnpm db:studio → tabelas faturas, itens_fatura, pagamentos, seguros_pagamento existem
```

---

## Prompt 3.2 — FaturaService + Routes

```
Lê SKILL-financeiro.md (regras de ouro e cálculo de totais).
Lê docs/07-api/API_REFERENCE_v2.md (secção FATURAS).

1. Cria apps/api/src/services/auditLog.service.ts:
   log(params): prisma.auditLog.create({...})
   [simplificado — sem lógica complexa ainda, expandir no Sprint 6]

2. Cria apps/api/src/services/faturas.service.ts com:
   create(data, clinicaId, criadoPor):
     - gerar numeroFatura (ver MODULE-financeiro.md secção 2)
     - calcular subtotal e total
     - prisma.fatura.create com itens nested
     - auditLogService.log(CREATE)
     - publishEvent('fatura:emitida'...) quando emitida
   
   emitir(id, clinicaId, criadoPor):
     - verificar: estado === RASCUNHO
     - verificar: pelo menos 1 item
     - update para EMITIDA + dataEmissao
     - auditLogService.log(UPDATE)
   
   anular(id, clinicaId, motivo, criadoPor):
     - verificar: estado !== ANULADA
     - motivo obrigatório (AppError 400 se vazio)
     - update para ANULADA
     - auditLogService.log(UPDATE, antes=estadoAnterior, depois=ANULADA)
   
   registarPagamento(faturaId, data, clinicaId, criadoPor):
     - criar Pagamento
     - verificar se totalPago >= fatura.total → update para PAGA (transacção)
     - auditLogService.log(CREATE)
     - Se SEGURO: criar SeguroPagamento também
   
   list(filters, clinicaId): com paginação
   getOne(id, clinicaId): com itens, pagamentos, paciente

3. Cria apps/api/src/routes/faturas.ts com todos os endpoints de API_REFERENCE_v2.md

4. Regista a rota no server.ts:
   app.use('/api/faturas', authenticate, tenantMiddleware, faturasRouter);
   app.use('/api/pagamentos', authenticate, tenantMiddleware, pagamentosRouter);

5. Escreve testes de integração:
   - POST /faturas → 201 com numeroFatura gerado
   - PATCH /faturas/:id/emitir → EMITIDA
   - POST /faturas/:id/pagamentos (parcial) → EMITIDA (ainda)
   - POST /faturas/:id/pagamentos (total) → PAGA automaticamente
   - PATCH /faturas/:id/anular → ANULADA; sem motivo → 400
   - PATCH /faturas/:id/anular já ANULADA → 409

6. Corre: pnpm test --run --filter=api

Reporta resultados. Zero falhas esperadas.
```

---

## Prompt 3.3 — UI Financeiro Core

```
Lê SKILL-financeiro.md.
Lê docs/FRONTEND_v2.md (secções 6, 7).

1. Cria apps/web/src/api/faturas.ts com funções para todos os endpoints financeiros

2. Cria apps/web/src/hooks/useFaturas.ts com:
   useFaturas(filters): useQuery para lista
   useFatura(id): useQuery para detalhe
   useCreateFatura(): useMutation
   useEmitirFatura(): useMutation
   useAnularFatura(): useMutation
   useRegistarPagamento(): useMutation

3. Cria pages/financeiro/:
   FaturasPage.tsx       — lista com tabs: RASCUNHO | EMITIDA | PAGA | ANULADA
   NovaFaturaPage.tsx    — wizard 3 passos (ver FRONTEND_v2.md secção 6)
   FaturaDetalhe.tsx     — detalhe + progress bar pagamento + modal pagamento

4. Adiciona ao router.tsx:
   /admin/financeiro        → FaturasPage (lazy)
   /admin/financeiro/nova   → NovaFaturaPage (lazy)
   /admin/financeiro/:id    → FaturaDetalhe (lazy)

5. Adiciona link "Financeiro" na Sidebar (só para ADMIN e RECEPCIONISTA)

6. Corre: pnpm build --filter=web && pnpm typecheck --filter=web

Testa manualmente:
   - Criar fatura com 2 itens → total calculado em tempo real
   - Emitir fatura → badge EMITIDA
   - Registar pagamento parcial → progress bar actualizada
   - Registar pagamento restante → badge PAGA

Checkpoint Sprint 3:
   - [ ] Ciclo completo RASCUNHO → EMITIDA → PAGA funciona end-to-end
   - [ ] formatKwanza() em todos os valores (sem decimais)
   - [ ] Audit log criado no DB para cada acção
   - [ ] pnpm typecheck zero erros
```

---

## Prompt 4.1 — Seguros + Relatórios

```
Lê docs/11-modules/MODULE-financeiro.md (secções 3, 5, 6).

1. Adiciona a FaturaDetalhe.tsx:
   - Se fatura.tipo === SEGURO: mostrar painel de estado do seguro
   - PENDENTE → botão "Submeter à Seguradora"
   - SUBMETIDO → botão "Registar Resposta" (APROVADO/REJEITADO)
   - APROVADO → mostrar valorAprovado vs valorSolicitado
   - REJEITADO → aviso "Contactar paciente para pagamento particular"

2. Cria apps/api/src/routes/relatorios.ts:
   GET /relatorios/receita:
     - verificar canUseFeature('relatoriosHist') se período > mês corrente
     - query SQL agregado (ver MODULE-financeiro.md secção 6)
     - retornar: totais, porMedico, serie temporal
   
   GET /relatorios/receita/export:
     - verificar canUseFeature('export')
     - gerar CSV com BOM \uFEFF, separador ;
     - Content-Type: text/csv, Content-Disposition: attachment

3. Cria pages/financeiro/RelatoriosPage.tsx:
   - Filtros: período (mês corrente | anterior | trimestre | custom), médico, tipo
   - 4 KPI cards: Receita Total, Consultas, Média/Consulta, Seguros Pendentes
   - Gráfico de barras com divs (ver FRONTEND_v2.md secção 7)
   - Tabela breakdown por médico
   - Botão Export CSV (desabilitado se plano BASICO com aviso)

4. Adiciona ao planEnforcementService:
   canUseFeature('relatoriosHist') e canUseFeature('export')
   [os métodos já existem do Sprint 5 — implementar agora se não existirem]

Checkpoint Sprint 4:
   - [ ] Ciclo de seguro: PENDENTE → SUBMETIDO → APROVADO/REJEITADO funciona
   - [ ] Relatório de receita correcto (verificar com dados de seed)
   - [ ] Export CSV: abrir no Excel Angola — caracteres corretos
   - [ ] Plano BASICO: acesso histórico bloqueado com mensagem clara (402)
```

---

## Prompt 4.2 — planEnforcementService + Seed de Planos

```
Lê docs/DATABASE_SCHEMA_v2.md (migration_002 — modelo PlanoLimite).
Lê docs/11-modules/MODULE-plataforma.md (secção 3 — tabela de limites).

1. Aplica migration_002 (apenas o PlanoLimite por agora — ApiKey e Webhook no Sprint 5):
   Adicionar apenas model PlanoLimite ao schema
   pnpm db:migrate → nome: "add_plan_limits"

2. Cria prisma/seeds/planLimits.ts (idempotente):
   BASICO:     { maxMedicos: 2, maxConsultasMes: 100, maxPacientes: 500, apiKeyPermitido: false, webhookPermitido: false, relatoriosHist: false, exportPermitido: false }
   PRO:        { maxMedicos: 10, maxConsultasMes: -1, maxPacientes: -1, apiKeyPermitido: true, maxApiKeys: 3, webhookPermitido: true, maxWebhooks: 5, relatoriosHist: true, exportPermitido: true }
   ENTERPRISE: { maxMedicos: -1, maxConsultasMes: -1, maxPacientes: -1, apiKeyPermitido: true, maxApiKeys: -1, webhookPermitido: true, maxWebhooks: -1, relatoriosHist: true, exportPermitido: true }
   
   Usar upsert para cada plano (safe para correr múltiplas vezes)

3. Cria apps/api/src/services/planEnforcement.service.ts (ver BACKEND_v2.md secção 8):
   check(clinicaId, 'medicos'|'consultas'|'pacientes')
   canUseFeature(clinicaId, 'apiKey'|'webhook'|'relatoriosHist'|'export')

4. Adiciona check() nos services existentes:
   - medicosService.create() → planEnforcementService.check(clinicaId, 'medicos')
   - agendamentosService.create() → planEnforcementService.check(clinicaId, 'consultas')

5. Corre seed:
   pnpm --filter=api exec ts-node prisma/seeds/planLimits.ts

Verifica:
   pnpm db:studio → tabela plano_limites com 3 registos
   POST /medicos em clínica BASICO com 2 médicos já → 402 com mensagem clara
```
