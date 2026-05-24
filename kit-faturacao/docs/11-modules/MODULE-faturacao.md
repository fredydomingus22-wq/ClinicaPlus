# MODULE — Faturação Fiscal Certificada AGT (Sprints I, II, III, IV)

**ADR:** ADR-018
**Stack:** Prisma 5 · Express 4 · RSA-2048 · xmlbuilder2 · React 18 · TanStack Query v5 · Zustand · React Hook Form + Zod

---

## Sprint I — Schema, Sequenciamento e Motor de Cálculo (1 semana)

### I1. Revisão do Schema Prisma Existente

O schema actual já contém: `Fatura`, `ItemFatura`, `Pagamento`, `SeguroPagamento`, `FaturaAssinatura`, e os enums `EstadoFatura`, `TipoFatura`, `TipoDocumentoFiscal`, `MetodoPagamento`, `RegimeFiscal`.

**Extensões obrigatórias:**

```prisma
// ─── SEQUÊNCIA DOCUMENTAL (NOVO) ──────────────────────────────────────────────

model SequenciaDocFiscal {
  id            String              @id @default(cuid())
  clinicaId     String
  tipoDoc       TipoDocumentoFiscal
  serie         String              @default("CPLS")
  anoFiscal     Int
  ultimoNumero  Int                 @default(0)

  clinica       Clinica  @relation(fields: [clinicaId], references: [id])

  @@unique([clinicaId, tipoDoc, serie, anoFiscal])
  @@map("sequencia_doc_fiscal")
}

// ─── SNAPSHOT FISCAL (NOVO) ────────────────────────────────────────────────────

model FaturaSnapshot {
  id                 String   @id @default(cuid())
  faturaId           String   @unique
  emitenteNif        String
  emitenteNome       String
  emitenteEndereco   String
  emitenteCidade     String?
  emitenteProvincia  String?
  clienteNome        String
  clienteNif         String   @default("999999990")
  clienteEndereco    String?
  regimeFiscal       RegimeFiscal
  criadoEm           DateTime @default(now())

  fatura             Fatura   @relation(fields: [faturaId], references: [id])

  @@map("fatura_snapshots")
}

// ─── CAMPOS ADICIONAIS NO MODEL Fatura EXISTENTE ───────────────────────────────
// Adicionar ao model Fatura:
//   faturaOriginalId  String?             // Referência para NC→FT
//   motivoAnulacao    String?             // Obrigatório se estado=ANULADA
//   snapshot          FaturaSnapshot?     // Relação 1:1
//   faturaOriginal    Fatura?  @relation("FaturaAnulacao", fields: [faturaOriginalId], references: [id])
//   notasCredito      Fatura[] @relation("FaturaAnulacao")

// ─── CAMPOS ADICIONAIS NO MODEL Clinica ─────────────────────────────────────
// Já existem: nif, razaoSocial, regimeFiscal, agtSoftwareCert, enderecoPostal
// Adicionar:
// 3.  **Submissão AGT (Assíncrona):**
    *   Job Enqueued (BullMQ).
    *   Chamada `POST /registarFactura` com JWS.
    *   Polling do estado até `VALIDA`.
    *   Armazenamento do `requestID` e `estadoAGT`.

4.  **Finalização:**
    *   Geração de QR Code (com logo AGT).
    *   Geração de PDF (Certificado).
//   serieDocFiscal      String   @default("CPLS") // Série documental configurável
//   sequencias          SequenciaDocFiscal[]  // Relação inversa
```

> [!WARNING] Imutabilidade
> Após esta migração, criar middleware Prisma `$use` que bloqueia `.update()` e `.delete()` em `Fatura` quando `estado !== 'RASCUNHO'`. A violação deve lançar `AppError(403, 'Documento fiscal imutável')`.

### I2. Migração e Seed (Cold-Start)

Após rodar `pnpm db:migrate --name module_faturacao_fiscal`:

```typescript
// Seed: Sequências iniciais para a clínica padrão
for (const tipo of ["FT", "FR", "NC", "ND", "VD"] as const) {
  await prisma.sequenciaDocFiscal.create({
    data: {
      clinicaId,
      tipoDoc: tipo,
      serie: "CPLS",
      anoFiscal: new Date().getFullYear(),
      ultimoNumero: 0,
    },
  });
}
```

### I3. Motor de Cálculo com Regime Fiscal

```typescript
// packages/utils/src/fiscal/calculo.ts

interface ItemCalculo {
  precoUnit: number; // Kwanza inteiro
  quantidade: number;
  desconto: number; // Kwanza inteiro
  taxaIva?: number; // Override se necessário
  codigoIva?: string; // IVA | ISE | RED
  motivoIsencao?: string;
}

interface ResultadoCalculo {
  subtotal: number;
  totalDesconto: number;
  totalIva: number;
  total: number;
  retencaoFonte: number;
  itensCalculados: ItemCalculado[];
}

/**
 * Calcula totais de uma fatura respeitando o regime fiscal da clínica.
 * Todos os valores em Kwanza (inteiros). Sem floats.
 */
export function calcularFatura(
  itens: ItemCalculo[],
  regimeFiscal: RegimeFiscal,
): ResultadoCalculo {
  const taxaPadrao = {
    GERAL: 14,
    SIMPLIFICADO: 7,
    ISENTO: 0,
  }[regimeFiscal];

  const itensCalculados = itens.map((item) => {
    const baseItem = item.precoUnit * item.quantidade;
    const descontoItem = item.desconto ?? 0;
    const baseComDesconto = baseItem - descontoItem;
    const taxa = item.taxaIva ?? taxaPadrao;
    const ivaItem = Math.round(baseComDesconto * (taxa / 100));
    const totalItem = baseComDesconto + ivaItem;

    return {
      ...item,
      taxaIva: taxa,
      codigoIva: taxa === 0 ? "ISE" : taxa === 7 ? "RED" : "IVA",
      base: baseComDesconto,
      iva: ivaItem,
      total: totalItem,
    };
  });

  const subtotal = itensCalculados.reduce((s, i) => s + i.base, 0);
  const totalIva = itensCalculados.reduce((s, i) => s + i.iva, 0);
  const total = subtotal + totalIva;

  return {
    subtotal,
    totalDesconto: itensCalculados.reduce((s, i) => s + (i.desconto ?? 0), 0),
    totalIva,
    total,
    retencaoFonte: 0, // Configurable per service type in future
    itensCalculados,
  };
}
```

### I4. Tipos Partilhados Zod — `packages/types/src/faturacao.ts`

```typescript
import { z } from "zod";

// ─── ENUMS
export const EstadoFaturaSchema = z.enum([
  "RASCUNHO",
  "EMITIDA",
  "PAGA",
  "ANULADA",
]);
export type EstadoFatura = z.infer<typeof EstadoFaturaSchema>;

export const TipoDocFiscalSchema = z.enum(["FT", "FR", "VD", "NC", "ND"]);
export type TipoDocFiscal = z.infer<typeof TipoDocFiscalSchema>;

export const RegimeFiscalSchema = z.enum(["GERAL", "SIMPLIFICADO", "ISENTO"]);
export type RegimeFiscal = z.infer<typeof RegimeFiscalSchema>;

export const MetodoPagamentoSchema = z.enum([
  "DINHEIRO",
  "TRANSFERENCIA_BANCARIA",
  "TPA",
  "SEGURO",
]);
export type MetodoPagamento = z.infer<typeof MetodoPagamentoSchema>;

// ─── ITEM
export const ItemFaturaInputSchema = z.object({
  descricao: z.string().min(1).max(500),
  quantidade: z.number().int().min(1).max(9999),
  precoUnit: z.number().int().min(0), // Kwanza
  desconto: z.number().int().min(0).default(0),
  taxaIva: z.number().min(0).max(100).optional(), // Override do regime
  codigoIva: z.string().max(10).optional(),
  motivoIsencao: z.string().max(200).optional(),
});

// ─── CRIAR FATURA (RASCUNHO)
export const CriarFaturaSchema = z.object({
  pacienteId: z.string().cuid(),
  agendamentoId: z.string().cuid().optional(),
  medicoId: z.string().cuid().optional(),
  tipo: z.enum(["PARTICULAR", "SEGURO"]).default("PARTICULAR"),
  notas: z.string().max(1000).optional(),
  itens: z.array(ItemFaturaInputSchema).min(1, "Mínimo 1 item obrigatório"),
});
export type CriarFaturaDto = z.infer<typeof CriarFaturaSchema>;

// ─── REGISTAR PAGAMENTO
export const CriarPagamentoSchema = z.object({
  metodo: MetodoPagamentoSchema,
  valor: z.number().int().min(1), // Kwanza
  referencia: z.string().max(100).optional(),
  notas: z.string().max(500).optional(),
});
export type CriarPagamentoDto = z.infer<typeof CriarPagamentoSchema>;

// ─── CRIAR NOTA DE CRÉDITO
export const CriarNotaCreditoSchema = z.object({
  motivo: z.string().min(5).max(500),
  itens: z.array(ItemFaturaInputSchema).optional(), // Se omitido, anula totalmente
});
export type CriarNotaCreditoDto = z.infer<typeof CriarNotaCreditoSchema>;

// ─── CONFIGURAÇÃO FISCAL (admin)
export const ConfiguracaoFiscalSchema = z.object({
  nif: z.string().length(9, "NIF deve ter exactamente 9 dígitos"),
  razaoSocial: z.string().min(3).max(200),
  enderecoPostal: z.string().min(5).max(500),
  cidade: z.string().min(2).max(100).optional(),
  provincia: z.string().min(2).max(100).optional(),
  regimeFiscal: RegimeFiscalSchema,
  serieDocFiscal: z.string().min(2).max(10).default("CPLS"),
  agtSoftwareCert: z.string().max(100).optional(),
});
export type ConfiguracaoFiscalDto = z.infer<typeof ConfiguracaoFiscalSchema>;

// ─── SAF-T EXPORT PARAMS
export const SaftExportSchema = z.object({
  ano: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});
```

### I5. Serviço de Sequenciamento Atómico

```typescript
// apps/api/src/services/fiscal/SequenciaService.ts

/**
 * Gera o próximo número sequencial dentro de uma transação Prisma.
 * Usa SELECT FOR UPDATE para prevenir lacunas em concorrência.
 */
export async function proximoNumero(
  tx: Prisma.TransactionClient,
  clinicaId: string,
  tipoDoc: TipoDocumentoFiscal,
  serie: string = "CPLS",
): Promise<{ numero: number; formatado: string }> {
  const anoFiscal = new Date().getFullYear();

  // Upsert + lock
  const seq = (await tx.$queryRaw`
    INSERT INTO sequencia_doc_fiscal (id, clinica_id, tipo_doc, serie, ano_fiscal, ultimo_numero)
    VALUES (gen_random_uuid(), ${clinicaId}, ${tipoDoc}, ${serie}, ${anoFiscal}, 1)
    ON CONFLICT (clinica_id, tipo_doc, serie, ano_fiscal)
    DO UPDATE SET ultimo_numero = sequencia_doc_fiscal.ultimo_numero + 1
    RETURNING ultimo_numero
  `) as { ultimo_numero: number }[];

  const numero = seq[0].ultimo_numero;
  const formatado = `${tipoDoc} ${serie}/${numero}`;
  return { numero, formatado };
}
```

---

## Sprint II — Assinatura RSA, Emissão e Imutabilidade (1 semana)

### II1. CertificationService (RSA-2048)

```typescript
// apps/api/src/services/fiscal/CertificationService.ts

import crypto from "node:crypto";

const RSA_PRIVATE_KEY = process.env.AGT_PRIVATE_KEY?.replace(/\\n/g, "\n");
const HASH_LENGTH = 172; // Base64 truncado

/**
 * Assina dados do documento fiscal com RSA-2048.
 * @returns Hash de 172 caracteres Base64
 */
export function assinarDocumento(dados: {
  dataEmissao: string; // ISO
  dataDocumento: string;
  numero: string; // "FT CPLS/42"
  total: number; // Kwanza inteiro
  hashAnterior: string; // Hash do documento anterior na cadeia (vazio se primeiro)
}): string {
  if (!RSA_PRIVATE_KEY) {
    throw new AppError(
      500,
      "Chave RSA não configurada — variável AGT_PRIVATE_KEY em falta",
    );
  }

  const payload = [
    dados.dataEmissao,
    dados.dataDocumento,
    dados.numero,
    String(dados.total),
    dados.hashAnterior,
  ].join(";");

  const signer = crypto.createSign("SHA256");
  signer.update(payload);
  const fullSignature = signer.sign(RSA_PRIVATE_KEY, "base64");

  return fullSignature.substring(0, HASH_LENGTH);
}

/**
 * Obtém o hash do último documento emitido para manter a chain.
 */
export async function obterHashAnterior(
  tx: Prisma.TransactionClient,
  clinicaId: string,
  tipoDoc: TipoDocumentoFiscal,
): Promise<string> {
  const ultimo = await tx.fatura.findFirst({
    where: {
      clinicaId,
      tipoDocFiscal: tipoDoc,
      estado: { not: "RASCUNHO" },
      fiscalHash: { not: null },
    },
    orderBy: { dataEmissao: "desc" },
    select: { fiscalHash: true },
  });

  return ultimo?.fiscalHash ?? "";
}
```

### II2. Serviço de Emissão (FaturaService.emitir)

A emissão é a operação mais crítica — tudo ocorre numa transação atómica:

```typescript
// apps/api/src/services/fiscal/FaturaService.ts

export async function emitirFatura(
  clinicaId: string,
  faturaId: string,
  userId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      // 1. Buscar fatura com itens (lock)
      const fatura = await tx.fatura.findUniqueOrThrow({
        where: { id: faturaId },
        include: { itens: true, paciente: true },
      });

      // 2. Validações pré-emissão
      assertEstadoPermiteEmissao(fatura.estado); // RASCUNHO apenas
      assertTemItens(fatura.itens);

      // 3. Buscar dados fiscais da clínica
      const clinica = await tx.clinica.findUniqueOrThrow({
        where: { id: clinicaId },
        select: {
          nif: true,
          razaoSocial: true,
          enderecoPostal: true,
          cidade: true,
          provincia: true,
          regimeFiscal: true,
          serieDocFiscal: true,
        },
      });
      assertDadosFiscaisCompletos(clinica);

      // 4. Recalcular totais
      const calculo = calcularFatura(fatura.itens, clinica.regimeFiscal);

      // 5. Gerar número sequencial
      const { formatado: numeroFatura } = await proximoNumero(
        tx,
        clinicaId,
        fatura.tipoDocFiscal,
        clinica.serieDocFiscal,
      );

      // 6. Hash chain
      const hashAnterior = await obterHashAnterior(
        tx,
        clinicaId,
        fatura.tipoDocFiscal,
      );
      const agora = new Date();
      const fiscalHash = assinarDocumento({
        dataEmissao: agora.toISOString(),
        dataDocumento: agora.toISOString().split("T")[0],
        numero: numeroFatura,
        total: calculo.total,
        hashAnterior,
      });

      // 7. Snapshot dos dados do emitente e cliente
      await tx.faturaSnapshot.create({
        data: {
          faturaId,
          emitenteNif: clinica.nif!,
          emitenteNome: clinica.razaoSocial!,
          emitenteEndereco: clinica.enderecoPostal!,
          emitenteCidade: clinica.cidade,
          emitenteProvincia: clinica.provincia,
          clienteNome: fatura.paciente.nome,
          clienteNif: "999999990", // Consumidor final por defeito
          regimeFiscal: clinica.regimeFiscal,
        },
      });

      // 8. Atualizar fatura
      const faturaEmitida = await tx.fatura.update({
        where: { id: faturaId },
        data: {
          estado: "EMITIDA",
          numeroFatura,
          dataEmissao: agora,
          subtotal: calculo.subtotal,
          totalIva: calculo.totalIva,
          total: calculo.total,
          fiscalHash,
          hashControl: "1",
        },
        include: { itens: true, snapshot: true },
      });

      // 9. Audit log
      await auditLogService.log({
        clinicaId,
        entidade: "Fatura",
        entidadeId: faturaId,
        accao: "EMITIDA",
        actorId: userId,
        depois: { numero: numeroFatura, total: calculo.total },
      });

      // 10. Enqueue envio AGT (assíncrono)
      await agtReportQueue.add("report-agt", { faturaId, clinicaId });

      return faturaEmitida;
    },
    { isolationLevel: "Serializable" },
  );
}
```

### II3. Middleware de Imutabilidade Prisma

```typescript
// apps/api/src/middleware/fiscal-immutability.middleware.ts
prisma.$use(async (params, next) => {
  if (params.model === "Fatura") {
    if (params.action === "update" || params.action === "delete") {
      const fatura = await prisma.fatura.findUnique({
        where: { id: params.args.where.id },
        select: { estado: true },
      });
      if (fatura && fatura.estado !== "RASCUNHO") {
        throw new AppError(
          403,
          "Documento fiscal emitido é imutável. Use Nota de Crédito para anulação.",
        );
      }
    }
  }
  return next(params);
});
```

---

## Sprint III — API AGT, SAF-T Export e Worker (1 semana)

### III1. AgtApiClient (Reporte em tempo real)

O `AgtApiClient` reporta documentos fiscais emitidos à API e-Factura AGT. Em desenvolvimento, funciona em modo mock (apenas loga). Em produção, faz POST à API real.

### III2. Worker BullMQ (Retry com backoff)

Fila `report-agt` com worker que:

1. Lê fatura emitida.
2. Envia à API AGT.
3. Atualiza `statusEnvio` → `ENVIADO` e grava `agtRequestID`.
4. Se falhar, fica `PENDENTE` — worker retenta com `backoff: { type: 'exponential', delay: 60000 }` (máx 5 tentativas).

### III3. SAF-T AO Export (xmlbuilder2)

Gera XML compatível com SAF-T Angola:

- **Header:** CompanyID (NIF), TaxRegistrationNumber, CompanyName, AddressDetail
- **MasterFiles:** Customer (pacientes com faturas no período)
- **SourceDocuments > SalesInvoices:** Todos os documentos fiscais emitidos no período (FT, FR, NC, ND, VD) com linhas, impostos,

### 1.1 Glossário e Terminologia

Para manter a consistência com o codebase existente e as novas regras da AGT 2026:

| Conceito        | Termo no Código (Project) | Termo nas Skills / AGT  | Descrição                                    |
| :-------------- | :------------------------ | :---------------------- | :------------------------------------------- |
| Documento       | `Fatura`                  | `Factura`               | Usamos `Fatura` (sem 'c') em variáveis e DB. |
| Número único    | `numeroFatura`            | `documentNo`            | Formato: `FT SET1/1`.                        |
| ID Contribuinte | `nif`                     | `taxRegistrationNumber` | NIF de 9 dígitos.                            |
| Total Base      | `subtotal`                | `netTotal`              | Valor sem impostos.                          |
| Total Imposto   | `totalIva`                | `taxPayable`            | Somatório do IVA.                            |
| Total Final     | `total`                   | `grossTotal`            | Valor com impostos.                          |
| Estado Fiscal   | `estadoAGT`               | `estadoAGT`             | PENDENTE, VALIDA, INVALIDA.                  |

### IV1. Página: Configuração Fiscal (`/admin/configuracao/fiscal`)

A página mais crítica para o utilizador — **sem ela, nenhuma emissão funciona**. Deve ter 3 secções Card:

**Card 1 — Dados do Contribuinte:**

- NIF (input mask 9 dígitos)
- Razão Social
- Endereço Postal (logradouro completo)
- Cidade + Província (selects com valores angolanos)
- **Regimes Fiscais:** Geral, Simplificado, Exclusão (EXUSA).
- **Campos Item:** `precoUnit`, `quantidade`, `taxaIva`, `codigoIva`, `total`.

**Card 2 — Certificação de Software:**

- Número de Certificação AGT (`agtSoftwareCert`)
- Série Documental (ex: CPLS)
- Estado da certificação (badge verde/vermelho)

**Card 3 — Integração API e-Factura:**

- Credenciais AGT (Basic Auth) são **globais** e configuradas no servidor (`AGT_USERNAME`/`AGT_PASSWORD`).
- URL da API (display only, auto-detectado pelo NODE_ENV)
- Botão "Testar Conexão" com feedback visual

**Validações de UI:**

- Formulário usa `zodResolver(ConfiguracaoFiscalSchema)`.
- NIF: 9 dígitos obrigatórios, input mask.
- Todos os campos obrigatórios#### Estados Fiscais (AGT)
- `PENDENTE`: Aguarda submissão ou retorno inicial.
- `SUBMETIDA`: Enviada à AGT, aguarda processamento (polling).
- `VALIDA`: Aceite e validada pela AGT.
- `INVALIDA`: Rejeitada pela AGT (erros no schema ou dados).
- `CONTINGENCIA`: Emitida localmente mas não reportada (sem internet).
  s com sucesso".

### IV2. Página: Lista de Facturas (`/admin/financeiro`)

Tabela profissional com:

- Filtros: Estado (todos, rascunho, emitida, paga, anulada) + range de datas
- Colunas: Número | Paciente | Data | Total | IVA | Estado | Ações
- Badge de estado cromático (ver `reference/ui-patterns.md`)
- Row actions: Ver | Imprimir | Emitir (só rascunho) | Anular via NC (só emitida/paga)
- FAB "Nova Factura" → abre modal de criação

### IV3. Modal: CriarFaturaForm

- **Select Paciente** (combobox com pesquisa, usa `usePacientes`)
- **Tabela de Itens** dinâmica:
  - Linhas adicionáveis/removíveis
  - Campos: Descrição | Qtd | Preço Unit. (Kz) | Desc. | IVA | Total
  - Totais auto-calculados em footer
- **Resumo fiscal** lateral:
  - Subtotal, Desconto, IVA (com taxa), **Total**
  - Todas as formatações em AOA (Kz) com separador de milhares

### IV4. View: FaturaDetalhe (`/admin/faturas/:id`)

Página completa com toda a informação fiscal:

- Header com número, data, estado (badge grande)
- Dados do emitente (snapshot) e cliente
- Tabela de itens com Qty × Preço = Total
- Resumo: Subtotal + IVA + Total
- Dados de assinatura: Hash (truncada) + Hash Control
- Histórico de pagamentos
- Botões de acção contextuais (conforme estado)

### IV5. Componente: FaturaPreview (PDF-like)

Componente React que renderiza uma pré-visualização A4 da factura:

- Layout: Dados emitente (topo-esquerda) | Logo (topo-direita)
- Bloco cliente em seguida
- Tabela de itens com cabeçalhos
- Resumo + Total por extenso (campo `valorExtenso`)
- Footer: Certificação AGT + Hash (primeiros 20 chars) + "Processado por computador"
- Botão "Imprimir" → `window.print()` com `@media print` CSS

### IV6. Hooks e APIs de Frontend

```typescript
// apps/web/src/api/faturas.api.ts
export const faturasApi = {
  listar: (params) => api.get("/clinica/faturas", { params }),
  obter: (id) => api.get(`/clinica/faturas/${id}`),
  criar: (data) => api.post("/clinica/faturas", data),
  emitir: (id) => api.post(`/clinica/faturas/${id}/emitir`),
  registarPgto: (id, data) =>
    api.post(`/clinica/faturas/${id}/pagamentos`, data),
  criarNC: (id, data) => api.post(`/clinica/faturas/${id}/nota-credito`, data),
};

// apps/web/src/api/fiscal.api.ts
export const fiscalApi = {
  obterConfig: () => api.get("/clinica/definicoes/fiscal"),
  guardarConfig: (data) => api.patch("/clinica/definicoes/fiscal", data),
  testarConexao: () => api.post("/clinica/fiscal/testar-conexao"),
  exportarSaft: (params) =>
    api.get("/clinica/fiscal/saft", { params, responseType: "blob" }),
  auditHashChain: () => api.get("/clinica/fiscal/audit/hash-chain"),
};

// apps/web/src/hooks/useFaturas.ts
export function useFaturas(filtros) {
  return useQuery({
    queryKey: ["faturas", filtros],
    queryFn: () => faturasApi.listar(filtros),
  });
}
export function useFatura(id) {
  return useQuery({
    queryKey: ["fatura", id],
    queryFn: () => faturasApi.obter(id),
    enabled: !!id,
  });
}
export function useEmitirFatura() {
  return useMutation({
    mutationFn: (id) => faturasApi.emitir(id) /* invalidate + toast */,
  });
}
export function useConfiguracaoFiscal() {
  return useQuery({
    queryKey: ["fiscal", "config"],
    queryFn: fiscalApi.obterConfig,
    staleTime: 60000,
  });
}
```

---

## Testes (Cross-Sprint)

### Testes Unitários (API)

```typescript
// apps/api/src/__tests__/unit/faturacao.test.ts

describe("Motor de Cálculo Fiscal", () => {
  it("aplica IVA 14% no regime GERAL", () => {
    /* ... */
  });
  it("aplica IVA 7% no regime SIMPLIFICADO", () => {
    /* ... */
  });
  it("aplica IVA 0% com motivoIsencao no regime ISENTO", () => {
    /* ... */
  });
  it("arredonda sem floats (só inteiros Kwanza)", () => {
    /* ... */
  });
  it("calcula desconto antes do IVA", () => {
    /* ... */
  });
});

describe("CertificationService", () => {
  it("gera hash de 172 caracteres", () => {
    /* ... */
  });
  it("hash chain: hash inclui hash do documento anterior", () => {
    /* ... */
  });
  it("lança erro se chave RSA não configurada", () => {
    /* ... */
  });
});

describe("SequenciaService", () => {
  it("incrementa sequencialmente sem lacunas", () => {
    /* ... */
  });
  it('formata como "FT CPLS/1"', () => {
    /* ... */
  });
  it("mantém séries separadas por tipoDoc", () => {
    /* ... */
  });
});

describe("Máquina de Estados (Fatura)", () => {
  it("permite RASCUNHO → EMITIDA", () => {
    /* ... */
  });
  it("permite EMITIDA → PAGA", () => {
    /* ... */
  });
  it("permite EMITIDA → ANULADA (via NC)", () => {
    /* ... */
  });
  it("bloqueia EMITIDA → RASCUNHO", () => {
    /* ... */
  });
  it("bloqueia ANULADA → qualquer", () => {
    /* ... */
  });
});
```

### Teste de Compliance (End-to-End)

```typescript
// apps/api/src/__tests__/integration/compliance.test.ts
describe("Compliance AGT", () => {
  it("fluxo completo: criar → emitir → pagar → exportar SAF-T", () => {
    /* ... */
  });
  it("fluxo anulação: FT emitida → NC vinculada → ambas no SAF-T", () => {
    /* ... */
  });
  it("hash chain é validável com chave pública", () => {
    /* ... */
  });
  it("middleware bloqueia update em fatura EMITIDA", () => {
    /* ... */
  });
  it("SAF-T contém todos os documentos do período", () => {
    /* ... */
  });
});
```
