---
name: faturacao
description: Módulo de Faturação Fiscal Certificado AGT — implementação de emissão de documentos fiscais, assinatura RSA-2048, hash chain, SAF-T AO, e UI de configuração/gestão. INVOCAR quando o utilizador mencionar faturas, faturação, fiscal, AGT, SAF-T, IVA, nota de crédito, ou certificação de software de faturação.
---

# Skill: Faturação Fiscal Certificada AGT

## Quando Invocar

INVOCA esta skill quando o utilizador mencionar:

- Faturas / Faturação / Facturação
- AGT / e-Factura / Certificação de software
- SAF-T / Exportação fiscal
- IVA / Regime fiscal / Imposto
- Nota de Crédito / Anulação de documentos
- Hash chain / Assinatura RSA / Integridade fiscal
- Configurações fiscais / Dados do contribuinte
- Pagamentos em factura / Recibo

## Referências Obrigatórias

Antes de começar qualquer implementação, ler na seguinte ordem:

1. `kit-faturacao/docs/01-adr/ADR-018-faturacao-fiscal.md` — Decisões arquitecturais
2. `kit-faturacao/docs/11-modules/MODULE-faturacao.md` — Especificação completa do módulo (4 Sprints)
3. `kit-faturacao/kit/prompts/14-faturacao/PROMPTS-14-faturacao.md` — Guião passo-a-passo para implementação
4. **Referências rápidas (consultar conforme necessário):**
   - `kit-faturacao/docs/02-reference/fiscal-states.md` — Máquina de estados e transições
   - `kit-faturacao/docs/02-reference/calculation-engine.md` — Motor de cálculo fiscal
   - `kit-faturacao/docs/02-reference/api-patterns.md` — Endpoints e padrões de API
   - `kit-faturacao/docs/02-reference/ui-patterns.md` — Componentes e padrões de UI
   - `kit-faturacao/docs/02-reference/saft-ao.md` — Estrutura SAF-T Angola

## Regras Invioláveis

### Imutabilidade (Regra #1)

- Fatura com `estado !== 'RASCUNHO'` é **IMUTÁVEL**. Nunca permitir edição ou eliminação.
- Anulação APENAS via Nota de Crédito (NC) vinculada.
- Middleware Prisma bloqueia `update/delete` em documentos emitidos.

### Hash Chain (Regra #2)

- Cada documento emitido é assinado com RSA-2048.
- Payload: `dataEmissao;dataDocumento;numero;total;hashAnterior`.
- Hash de 172 caracteres Base64, `hashControl = "1"`.
- Hash do primeiro documento usa string vazia como `hashAnterior`.

### Numeração Sequencial (Regra #3)

- Sem lacunas. `SELECT FOR UPDATE` em transação Serializable.
- Formato: `{TipoDoc} {Serie}/{Sequencial}` → ex: `FT CPLS/42`.
- Séries separadas por `TipoDocumentoFiscal` + clínica + ano fiscal.

### Multitenancy (Regra #4)

- Todo query fiscal DEVE incluir `clinicaId`.
- Snapshot de dados fiscais no momento da emissão (desacoplado de alterações futuras na clínica).

### Valores Monetários (Regra #5)

- Todos em Kwanza inteiro (sem floats). `Int` no Prisma, nunca `Float` ou `Decimal`.
- Formatação no frontend: `Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })`.

## Máquina de Estados

```
RASCUNHO → EMITIDA → PAGA → (estado final)
    ↓          ↓         ↓
    ✕      ANULADA¹  ANULADA¹
           (via NC)  (via NC)

¹ Anulação é sempre via emissão de Nota de Crédito vinculada.
  ANULADA é estado final — sem transições.
```

## Ficheiros-Chave

### Backend

| Ficheiro                                               | Responsabilidade                                             |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `apps/api/src/services/fiscal/FaturaService.ts`        | Criar, emitir, NC, pagamentos                                |
| `apps/api/src/services/fiscal/CertificationService.ts` | RSA-2048, hash chain                                         |
| `apps/api/src/services/fiscal/SequenciaService.ts`     | Numeração sequencial atómica                                 |
| `apps/api/src/services/fiscal/SaftService.ts`          | Export SAF-T AO XML# SKILL — Facturação Electrónica AGT 2026 |

## Core Services

### 1. Gestão de Séries e Numeração (Atómica)

Obriga ao uso de `SELECT FOR UPDATE` para garantir que o `numeroFatura` é sequencial e sem saltos/duplicados sob carga.

```typescript
export async function gerarDocumentNo(
  serieId: string,
): Promise<{ numeroFatura: string; sequence: number }> {
  return prisma.$transaction(async (tx) => {
    const serie = await tx.$queryRaw<SerieFacturacao[]>`
      SELECT * FROM series_facturacao WHERE id = ${serieId} FOR UPDATE
    `;
    const sequence = serie[0].currentSequence;
    const numeroFatura = `${serie[0].documentType} ${serie[0].seriesCode}/${sequence}`;

    await tx.serieFacturacao.update({
      where: { id: serieId },
      data: { currentSequence: { increment: 1 } },
    });

    return { numeroFatura, sequence };
  });
}
```

### 2. Assinaturas JWS (RS256)

Uso obrigatório de RS256 para assinatura de documentos e software.

```typescript
export function signJWS(payload: object): string {
  const privateKey = process.env.AGT_PRIVATE_KEY;
  // ... crypto.createSign('RSA-SHA256') ...
}
```

### 3. Máquina de Estados Fiscal

As faturas devem seguir o ciclo de vida definido pela AGT:

- `PENDENTE` → `SUBMETIDA` → `VALIDA` | `INVALIDA`
- `CONTINGENCIA` (quando sem internet)

### 4. QR Code & PDF

- QR Code versão 4, nível M.
- Logótipo da AGT obrigatório (<20% da área).
- Referência URL: `https://quiosqueagt.minfin.gov.ao/...`

## Fluxo de Emissão

1.  **Criação:** Criar fatura como `RASCUNHO` na DB.
2.  **Emissão (Atómica):** Obter série, gerar número, calcular totais, assinar (JWS), mudar estado para `EMITIDA`.
3.  **Submissão (Assíncrona):** Enfileirar (BullMQ) para submissão à API da AGT.
4.  **Polling:** Verificar estado até ser `VALIDA`.
5.  **Finalização:** Gerar QR Code e PDF.
    r de cálculo fiscal |
    | `packages/types/src/faturacao.ts` | Zod DTOs partilhados |

### Frontend

| Ficheiro                                              | Responsabilidade                 |
| ----------------------------------------------------- | -------------------------------- |
| `apps/web/src/pages/admin/ConfiguracaoFiscalPage.tsx` | Configurações fiscais da clínica |
| `apps/web/src/pages/financeiro/FaturasPage.tsx`       | Lista de facturas com filtros    |
| `apps/web/src/pages/financeiro/FaturaDetalhePage.tsx` | Detalhe/preview de factura       |
| `apps/web/src/components/faturas/CriarFaturaForm.tsx` | Modal de criação                 |
| `apps/web/src/components/faturas/FaturaPreview.tsx`   | Preview A4 para impressão        |
| `apps/web/src/hooks/useFaturas.ts`                    | TanStack Query hooks             |
| `apps/web/src/api/faturas.api.ts`                     | Chamadas axios                   |

## Debugging

Consultar `kit-faturacao/docs/10-runbooks/RUNBOOK-faturacao.md` para diagnósticos de:

- Hash chain corrompida
- Lacunas na numeração
- SAF-T inválido
- Falha de comunicação AGT
- Emissão falhada (dados incompletos)
