# Plano de Mitigação — Notas de Crédito (NC) na Integração AGT

Data: 2026-05-24  
Fonte de verdade: ficheiros da skill `agt-faturacao-electronica` (ex.: `references/servico-registar-factura.md`, `references/exemplos-payloads.md`, `references/codigos-erro.md`, `references/tabelas-referencia.md`, `subskills/04-registar-factura.md`).

---

## 1) Objectivo

Reduzir falhas e rejeições AGT na emissão/submissão de **Notas de Crédito (NC)**, garantindo:
- conformidade do payload `registarFactura` para `documentType = "NC"`;
- referências correctas ao documento base;
- regras de cálculo (linhas, impostos e totais) consistentes;
- prevenção de NC inválidas (E13/E14/E16/E42/E24, etc.);
- rastreabilidade (auditoria e diagnóstico rápido).

---

## 2) Principais falhas a mitigar (e como a AGT sinaliza)

Conforme `references/codigos-erro.md` + regras em `references/servico-registar-factura.md`:

1) **E13 — `referenceInfo` em falta**  
   - Causa: NC enviada sem `referenceInfo` nas linhas.

2) **E14 — Documento de referência desconhecido**  
   - Causa: `referenceInfo.reference` aponta para um `documentNo` que a AGT não reconhece.

3) **E16 — Para NC: soma créditos deve ser < soma débitos**  
   - Causa: uso invertido de `debitAmount/creditAmount`, ou sinal errado nas linhas.

4) **E42 — Valor a anular/devolver excede o ainda não anulado**  
   - Causa: NC parcial/total excede saldo disponível do documento original.

5) **E22/E23/E24 — Totais inconsistentes**  
   - Causa: `taxPayable`, `netTotal`, `grossTotal` não batem com as linhas (regras do serviço `registarFactura`).

6) **E09 — Documento duplicado**  
   - Causa: `documentNo` repetido (em reenvios, retries, concorrência ou falha de idempotência).

---

## 3) Regras AGT (checklist NC) — antes de enviar

### 3.1 Regras estruturais (schema)
1) `schemaVersion = "1.2"` e `numberOfEntries == len(documents)` (E04).  
2) `documentNo` no formato: `TIPO SERIE/SEQUENCIAL` (há espaço obrigatório entre `TIPO` e `SERIE`).  
3) Para **NC**: `lines` é obrigatório e `referenceInfo` é obrigatório **por linha** (`references/tabelas-referencia.md`).  
4) `documentTotals.grossTotal = netTotal + taxPayable` (E24).  
5) `taxContribution` deve ser arredondado **por excesso** ao cêntimo (ceiling) (regras em `subskills/04-registar-factura.md` / `references/servico-registar-factura.md`).

### 3.2 Regras de débito/crédito (NC)
Baseando no exemplo de NC em `references/exemplos-payloads.md`:
- Em NC, a linha usa **`debitAmount`** (e não `creditAmount`) para o valor base a anular/devolver.
- Garantir que no somatório final: **créditos < débitos** (E16).

### 3.3 Regras de referência do documento base (NC)
Por linha:
- `referenceInfo.reference` deve conter o `documentNo` do documento original (ex.: `FT FT2025SEDE001N/1`).  
- `referenceInfo.reason` obrigatório (motivo).  
Observação: algumas estruturas listam campos adicionais para `referenceInfo`; se a AGT exigir, incluir (ex.: `referenceItemLineNo`) e validar em HML.

---

## 4) Plano de Mitigação (implementação) — por camadas

### Fase A — Validações fortes antes de criar/emitir NC (domínio)

1) **Pré-validação do documento base (no nosso sistema)**
   - Só permitir NC para documentos em estado elegível (emitida/paga, conforme regra do produto).
   - Garantir que o documento base tem `numeroFatura` (documentNo) e dados fiscais completos.

2) **Controlo de “saldo a anular” (mitiga E42)**
   - Criar uma rotina para calcular “saldo anulável” do documento base:
     - `saldoBase = grossTotalOriginal - soma(grossTotal das NC válidas associadas)`
   - Bloquear NC se:
     - `grossTotalNC > saldoBase` (mitiga E42).
   - Para NC parcial, permitir valores até ao saldo.

3) **Validação de referência obrigatória (mitiga E13/E14)**
   - `referenceInfo` deve ser obrigatório na criação da NC (não apenas no momento de envio).
   - A referência deve ser exactamente o `documentNo` do documento base.

4) **Validação de sinal e débito/crédito (mitiga E16)**
   - Para NC, normalizar:
     - `debitAmount > 0`
     - `creditAmount = 0` ou omitido (mas nunca ambos com valor)
   - E validar regra agregada: `sum(creditAmount) < sum(debitAmount)`.

5) **Validação de totais (mitiga E22/E23/E24)**
   - Recalcular `netTotal`, `taxPayable`, `grossTotal` a partir das linhas (como pede a AGT).
   - Aplicar rounding por excesso (ceiling) no `taxContribution` antes de somar.

---

### Fase B — Payload builder NC “AGT-first” (infra / integração)

1) **Builder dedicado para NC**
   - Criar (ou ajustar) um builder específico `buildAgtRegistarFacturaPayloadNC(...)` para evitar divergências com FT.
   - Usar o exemplo de NC em `references/exemplos-payloads.md` como padrão:
     - `documentType: "NC"`
     - `lines[*].debitAmount`
     - `lines[*].referenceInfo.reference` + `reason`
     - Totais positivos (net/tax/gross) representando o montante a anular.

2) **JWS: garantir que o payload assinado é *exactamente* o exigido**
   - `jwsDocumentSignature` assina os campos definidos em `references/servico-registar-factura.md` e `references/assinaturas-jws.md`:
     - `{documentNo, taxRegistrationNumber, documentType, documentDate, customerTaxID, customerCountry, companyName, documentTotals}`
   - Evitar divergências de tipos/formatos entre o que é assinado e o que vai no `document`.

3) **Idempotência e retries (mitiga E09)**
   - Ao fazer retry, não gerar novo `documentNo` (a menos que seja **correcção** de rejeitado com `documentStatus="C"` e `rejectedDocumentNo`).
   - Manter uma chave idempotente por NC (ex.: `ncId` → `documentNo` fixo).

---

### Fase C — “Confirmação AGT” do documento base (mitiga E14)

Antes de submeter a NC, quando possível:
1) Verificar no nosso sistema se o documento base está “ENTREGUE/VALIDADO” na AGT (via `obterEstado`/`consultarFactura`).
2) Se não estiver confirmado/entregue:
   - (a) atrasar envio da NC (fila) até o documento base ficar válido; ou
   - (b) permitir envio mas com aviso/risco (configurável).

Isto reduz a chance de a AGT responder “referência desconhecida”.

---

### Fase D — Observabilidade e suporte (mitiga tempo de diagnóstico)

1) Log estruturado por NC:
   - `documentNo` (NC), `reference` (FT original), `submissionUUID`, `requestID`, `resultCode`, `idError`.
2) Mensagens orientadas ao operador para erros:
   - E13 → “NC sem referenceInfo”
   - E14 → “Documento base não existe/AGT não reconhece”
   - E16 → “Débito/crédito invertidos”
   - E42 → “Saldo anulável excedido”
3) Dashboard simples (contagem por erro/código).

---

## 5) Testes obrigatórios (para não regredir)

### Unit tests (builder)
- NC gera `referenceInfo` por linha.
- NC usa `debitAmount` e respeita E16 (soma créditos < débitos).
- Totais batem com as linhas (E22/E23/E24).
- Rounding por excesso no `taxContribution`.

### Integration tests
- Fluxo: emitir FT → enviar AGT → emitir NC total/parcial → enviar AGT.
- Bloqueio de NC quando excede saldo (E42).
- Reenvio (retry) não duplica `documentNo` (mitiga E09).

---

## 6) Ordem recomendada de execução

1) Implementar validação de saldo + referência (mitiga E42/E13/E14).  
2) Ajustar builder NC e garantir débito/crédito correcto (mitiga E16).  
3) Garantir totais + rounding por excesso (mitiga E22/E23/E24).  
4) Melhorar idempotência e retries (mitiga E09).  
5) Observabilidade + testes.

