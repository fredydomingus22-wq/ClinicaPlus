# ROLES & TASKS: Sprints I, II, III e IV — Módulo de Faturação Fiscal Certificado AGT

Este documento contém o guião cirúrgico passo-a-passo. Agentes AI e Programadores devem ler cada instrução à letra e implementar as especificações estritas sem atalhos.

---

# SPRINT I — Schema, Sequenciamento e Motor de Cálculo (Backend)

## Leituras e Preparação
Ler:
- `docs/01-adr/ADR-018-faturacao-fiscal.md` — decisões arquitecturais
- `docs/11-modules/MODULE-faturacao.md` — especificação completa do módulo
- `kit/skills/faturacao/reference/fiscal-states.md` — máquina de estados
- `kit/skills/faturacao/reference/calculation-engine.md` — motor de cálculo

O desrespeito pela imutabilidade documental ou pela cadeia de hash provocará *Rollback* da Pull Request.

---

## Passo I1 — Extensão do Schema Prisma

No ficheiro `apps/api/prisma/schema.prisma`:

1. **O model `Fatura` já existe.** Adicionar APENAS os novos campos:
   - `faturaOriginalId String?` — referência NC→FT
   - `motivoAnulacao String?` — obrigatório se NC
   - Relações: `faturaOriginal Fatura? @relation("FaturaAnulacao", fields: [faturaOriginalId], references: [id])` e `notasCredito Fatura[] @relation("FaturaAnulacao")`
   - `snapshot FaturaSnapshot?` — relação 1:1

2. **Criar novos models:**
   - `SequenciaDocFiscal` — sequência numérica atómica por tipo documento, série, e ano fiscal
   - `FaturaSnapshot` — foto imutável dos dados do emitente e cliente à emissão

3. **No model `Clinica`**, adicionar campos (se não existem):
   - (removido) `agtApiToken` — credenciais AGT são globais via env (`AGT_USERNAME`/`AGT_PASSWORD`)
   - `serieDocFiscal String @default("CPLS")`
   - `sequencias SequenciaDocFiscal[]` — relação inversa

4. **CRÍTICO**: Verificar que todos os enums existem: `EstadoFatura`, `TipoDocumentoFiscal`, `RegimeFiscal`, `TipoFatura`, `MetodoPagamento`, `EstadoSeguro`.

## Passo I2 — Migração & Seed

1. Execute: `pnpm db:migrate --name module_faturacao_fiscal`
2. Em `apps/api/prisma/seed.ts`, incluir lógica que crie sequências iniciais para os 5 tipos documentais (FT, FR, NC, ND, VD) no ano fiscal corrente.
3. `pnpm db:generate` para actualizar o Prisma Client.

## Passo I3 — Zod DTOs (packages/types/src/faturacao.ts)

Crie o ficheiro `packages/types/src/faturacao.ts` com os schemas exactos de `MODULE-faturacao.md` secção I4:
- `CriarFaturaSchema` — com array de `ItemFaturaInputSchema` (min 1)
- `CriarPagamentoSchema`
- `CriarNotaCreditoSchema`
- `ConfiguracaoFiscalSchema` — para o settings panel
- `SaftExportSchema` — params de export

Compile com `pnpm typecheck` e corrija erros.

## Passo I4 — Motor de Cálculo

Crie `packages/utils/src/fiscal/calculo.ts` com a função `calcularFatura()` exactamente como documentada em `MODULE-faturacao.md` secção I3.
- Todos os valores em Kwanza inteiro (sem floats para moeda).
- Aplicar taxa de IVA conforme regime fiscal.
- Desconto aplicado ANTES do IVA.

## Passo I5 — Serviço de Sequenciamento

Crie `apps/api/src/services/fiscal/SequenciaService.ts` com a função `proximoNumero()` documentada em `MODULE-faturacao.md` secção I5.
- Usa `SELECT FOR UPDATE` via `$queryRaw` para atomicidade.
- Formato de saída: `"FT CPLS/42"`.

## Passo I6 — Testes Unitários do Motor

Crie `apps/api/src/__tests__/unit/calculo-fiscal.test.ts`:
- 5 testes mínimos: GERAL (14%), SIMPLIFICADO (7%), ISENTO (0%, com motivo), arredondamento, desconto antes do IVA.
- Compile e rode: `pnpm test --filter=api`.

> ⚠️ **CHECKPOINT OBRIGATÓRIO (SPRINT I):** PARE AQUI! O Agente deve reportar ao utilizador que o Schema, DTOs, Motor de Cálculo e Sequenciamento estão prontos. Peça permissão explícita antes de iniciar o Sprint II.

---

# SPRINT II — Assinatura RSA, Emissão e Imutabilidade (Backend)

## Passo II1 — CertificationService (RSA-2048)

Crie `apps/api/src/services/fiscal/CertificationService.ts`:
- Função `assinarDocumento()`: concatena `dataEmissao;dataDocumento;numero;total;hashAnterior`, assina com SHA256+RSA, retorna 172 chars Base64.
- Função `obterHashAnterior()`: busca hash do último documento emitido na mesma série.
- Função `verificarAssinatura()`: usa chave pública para validar hash (para testes e auditoria).
- Carregamento das chaves via `AGT_PRIVATE_KEY` e `AGT_PUBLIC_KEY` das env vars.

## Passo II2 — FaturaService.emitir() (Transação Atómica)

Refactorar `apps/api/src/services/fiscal/FaturaService.ts`:
- Método `emitir()`: tudo dentro de `prisma.$transaction()` com `isolationLevel: 'Serializable'`.
- Sequência: validação → recalcular → numerar → assinar → snapshot → atualizar fatura → audit log → enqueue AGT.
- Ver `MODULE-faturacao.md` secção II2 para código de referência exacto.

## Passo II3 — FaturaService.criarNotaCredito()

Implementar `criarNotaCredito()`:
- Só permite NC em faturas EMITIDA ou PAGA.
- Cria nova fatura com `tipoDocFiscal = 'NC'`, `faturaOriginalId` apontando para a original.
- Duplica itens com valores negativos.
- Emite automaticamente (NC é sempre emitida no acto de criação).
- Marca fatura original como `estado = 'ANULADA'`.

## Passo II4 — Middleware de Imutabilidade

Criar middleware Prisma em `apps/api/src/middleware/fiscal-immutability.middleware.ts`:
- Bloqueia `.update()` e `.delete()` em `Fatura` quando `estado !== 'RASCUNHO'`.
- Excepção: o próprio `emitir()` que transita de RASCUNHO → EMITIDA (controlado pelo serviço, não pelo middleware).
- Resposta: `AppError(403, 'Documento fiscal imutável')`.

## Passo II5 — Testes de Compliance

Criar `apps/api/src/__tests__/unit/certification.test.ts`:
- Hash chain válida (verificável com chave pública).
- Hash tem exactamente 172 chars.
- Middleware bloqueia update em EMITIDA.
- NC vincula correctamente ao documento original.

> ⚠️ **CHECKPOINT OBRIGATÓRIO (SPRINT II):** PARE AQUI! Reportar que emissão fiscal com hash chain e imutabilidade estão operacionais. Peça autorização para Sprint III.

---

# SPRINT III — API AGT, SAF-T e Worker (Backend + Integração)

## Passo III1 — AgtApiClient

Refactorar `apps/api/src/services/fiscal/AgtApiClient.ts`:
- Mode mock (development, `NODE_ENV !== 'production'` ou `AGT_MOCK=true`): apenas loga.
- Mode real: POST à API e-Factura com dados do documento.
- Tratamento de erros: 401/403 → lançar `AppError`.
- Guardar `agtRequestID` no registo da fatura.

## Passo III2 — Worker BullMQ (report-agt)

No worker (ou dentro do módulo API se worker não existir):
- Fila: `report-agt`.
- Configuração: `backoff: 'exponential'`, `delay: 60000`, `attempts: 5`.
- Job: lê fatura → envia via `AgtApiClient` → actualiza `statusEnvio`.

## Passo III3 — SAF-T AO Service

Refactorar `apps/api/src/services/fiscal/SaftService.ts`:
- Aceita parâmetros `ano` e `mes` (opcional, se omitido exporta ano inteiro).
- Gera XML usando `xmlbuilder2`.
- Secções: Header, MasterFiles (Customer), SourceDocuments (SalesInvoices), TaxTable.
- Ver `kit/skills/faturacao/reference/saft-ao.md` para estrutura exacta.

## Passo III4 — Rotas Fiscais

Criar/actualizar ficheiros de rotas:
- `apps/api/src/routes/fiscal.routes.ts` → `/api/clinica/fiscal/saft`, `/api/clinica/fiscal/audit/hash-chain`, `/api/clinica/fiscal/testar-conexao`
- `apps/api/src/routes/faturas.routes.ts` → Ver `kit/skills/faturacao/reference/api-patterns.md` para mapa completo.
- `apps/api/src/routes/definicoes-fiscal.routes.ts` → PATCH `/api/clinica/definicoes/fiscal`

## Passo III5 — Testes de Integração

Criar `apps/api/src/__tests__/integration/compliance.test.ts`:
- Fluxo completo: criar → emitir → pagar → SAF-T.
- Fluxo anulação: FT → NC → ambas no SAF-T.
- Hash chain verificável.

> ⚠️ **CHECKPOINT OBRIGATÓRIO (SPRINT III):** PARE AQUI! Backend completo (emissão, assinatura, SAF-T, reporte AGT). Reportar que toda a API fiscal está pronta. Peça autorização para a UI (Sprint IV).

---

# SPRINT IV — UI Completa de Faturação (Frontend)

Atenção especial nesta secção às regras de UI: `zodResolver`, TailwindCSS, TanStack Query, pt-AO, e componentização estrita.

## Passo IV1 — APIs e Hooks (TanStack Query)

1. Crie `apps/web/src/api/faturas.api.ts` com métodos axios para todos os endpoints de faturação.
2. Crie `apps/web/src/api/fiscal.api.ts` com métodos para configuração fiscal e SAF-T.
3. Crie `apps/web/src/hooks/useFaturas.ts`:
   - `useFaturas(filtros)` — lista com cache
   - `useFatura(id)` — detalhe individual
   - `useCriarFatura()` — mutation + invalidação
   - `useEmitirFatura()` — mutation + toast "Factura emitida com sucesso"
   - `useRegistarPagamento()` — mutation
   - `useCriarNotaCredito()` — mutation
4. Crie `apps/web/src/hooks/useFiscal.ts`:
   - `useConfiguracaoFiscal()` — query para settings
   - `useGuardarConfiguracaoFiscal()` — mutation

## Passo IV2 — Página: Configuração de Faturação

Crie `apps/web/src/pages/admin/ConfiguracaoFiscalPage.tsx` (ou integre como tab em `ConfiguracaoPage.tsx`):

- **Layout:** 3 Cards verticais (Dados Contribuinte | Certificação | Integração AGT).
- **Formulário:** `zodResolver(ConfiguracaoFiscalSchema)`, `useForm()`.
- **Card 1 — Dados do Contribuinte:**
  - Inputs: NIF (mask 9 dígitos), Razão Social, Endereço Postal (usa campo `enderecoPostal` para SAF-T, facultativo), Cidade, Província (select), Regime Fiscal (select com opções: `[{value:'GERAL',label:'Regime Geral (IVA 14%)'}, {value:'SIMPLIFICADO',label:'Regime Simplificado (IVA 7%)'}, {value:'EXUSA',label:'Exclusão/Isento'}]`).
- **Card 2 — Certificação:**
  - Inputs: Nº Certificação AGT, Série Documental.
  - Badge: `if (config.agtSoftwareCert) → bg-green-100 text-green-700 "Certificado" : bg-amber-100 text-amber-700 "Não certificado"`.
- **Card 3 — Integração API:**
  - Input password toggle: Token API AGT.
  - Display: URL da API (auto).
  - Button "Testar Conexão" → `useTestarConexao()` → feedback badge.
- **Botão global:** "Guardar" → `useGuardarConfiguracaoFiscal()` → Toast: "Configuração fiscal guardada com sucesso".
- **Empty State:** Se nenhum dado fiscal configurado, mostrar banner: `bg-amber-50 text-amber-800 border-amber-200 "⚠️ Configure os dados fiscais antes de emitir facturas."`.

## Passo IV3 — Página: Lista de Facturas

Crie `apps/web/src/pages/financeiro/FaturasPage.tsx`:

- **Header:** "Faturação" com botão "Nova Factura" (abre CriarFaturaModal).
- **Filtros:** Select Estado + DateRange input.
- **Tabela:**
  - Colunas: Número (campo `numeroFatura`) | Paciente | Data Emissão | Total (Kz) | IVA | Estado | Ações
  - Formatação moeda: `new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })`
  - Badges de estado cromáticos (ver `reference/ui-patterns.md`):
    - `RASCUNHO` → `bg-neutral-100 text-neutral-600`
    - `EMITIDA` → `bg-blue-100 text-blue-700`
    - `PAGA` → `bg-green-100 text-green-700`
    - `ANULADA` → `bg-red-50 text-red-600 line-through`
  - Row actions: Ver (link) | Emitir (só RASCUNHO) | Registar Pgto (só EMITIDA) | Anular (só EMITIDA/PAGA, com confirm dialog)
- **Paginação:** Cursor-based ou offset.
- **Empty State:** `<EmptyState icon={ReceiptIcon} title="Sem facturas" description="Crie a primeira factura usando o botão acima." />`

## Passo IV4 — Modal: CriarFaturaForm

Crie componente `apps/web/src/components/faturas/CriarFaturaForm.tsx`:

- **Select Paciente:** Combobox com pesquisa (debounce 300ms), usa `usePacientes()`.
- **Select Médico (opcional):** dropdown de médicos activos.
- **Tabela de Itens Dinâmica:**
  - Cada linha: Descrição (text) | Qtd (number, min 1) | Preço Unit (number, Kz) | Desconto (number, Kz) | IVA (auto-preenchido pelo regime) | Total (calculado)
  - Botão "+ Adicionar Item" | Botão lixo para remover
  - Footer com totais: Subtotal | Desconto | IVA (%) | **Total Final**
  - Auto-cálculo usa `calcularFatura()` de `@clinicaplus/utils`.
- **Textarea:** Notas (opcional, max 1000 chars).
- **Botões:** "Cancelar" (Ghost) + "Guardar Rascunho" (Primary).
- **Regra UI:** Se `useConfiguracaoFiscal()` retornar sem `nif`, bloquear submissão e mostrar banner: `"Configure os dados fiscais em Definições > Dados Fiscais antes de criar facturas."` com link.

## Passo IV5 — Página: FaturaDetalhe

Crie `apps/web/src/pages/financeiro/FaturaDetalhePage.tsx`:

- **Header:** Número da fatura (H1) + Badge de estado grande + Botões de acção contextuais.
- **Grid de 2 colunas (desktop):**
  - Esquerda: Dados emitente (snapshot) + Dados cliente
  - Direita: Metadados (data, tipo documento, hash truncada, hash control)
- **Tabela de Itens:** Descrição | Qtd | Preço Unit | Desc | IVA | Total
- **Resumo fiscal:** Card com Subtotal + Desconto + IVA + Total + Total por extenso
- **Pagamentos:** Lista de pagamentos registados (data, método, valor, referência).
- **Botões de acção contextuais:**
  - RASCUNHO: "Editar" + "Emitir" (confirm dialog: "Após emissão o documento é irrevogável.")
  - EMITIDA: "Registar Pagamento" (abre modal) + "Imprimir" + "Anular" (abre dialog NC)
  - PAGA: "Imprimir" + "Anular" (abre dialog NC)
  - ANULADA: "Ver NC associada" (link para a NC)

## Passo IV6 — Componente FaturaPreview (Print)

Crie `apps/web/src/components/faturas/FaturaPreview.tsx`:

Layout A4 orientado para impressão:
- Topo: Logo da clínica (esquerda) | Dados emitente (direita)
- Bloco cliente: Nome + NIF
- Tabela de itens com header: `Descrição | Qtd | Preço Unit | IVA | Total`
- Resumo: Subtotal + IVA + Total
- Total por extenso: "Dezassete mil e cem kwanzas"
- Footer: "Processado por computador — Certificação AGT nº {cert}" + Hash (20 primeiros chars)
- CSS: `@media print` esconde navegação e aplica layout A4 (`@page { size: A4; margin: 1cm }`).

## Passo IV7 — Rotas React e Navegação

Adicionar ao router:
- `/admin/configuracao/fiscal` → `ConfiguracaoFiscalPage`
- `/admin/financeiro` → `FaturasPage`
- `/admin/financeiro/:id` → `FaturaDetalhePage`

Adicionar ao sidebar de administração:
- Secção "Financeiro" (já existente) com ícones: "Facturas" + Número de rascunhos como badge
- Em Configuração: link "Faturação" ou "Dados Fiscais"

## Passo IV8 — Testes Frontend

1. `pnpm test --filter=web`
2. Confirmar que modais encerram on `onSuccess` do mutation hook.
3. Confirmar toasts em pt-AO.
4. Verificar que formatação de moeda usa separadores corretos (pt-AO).
5. Labels **TODOS** em português angolano.

> ✅ **CHECKPOINT FINAL:** O Agente deve reportar que o Módulo de Faturação Fiscal está globalmente concluído (Backend: Schema + Motor + RSA + SAF-T + AGT | Frontend: Config + Lista + Detalhe + Preview + Print) e pronto para Revisão de Integração!
