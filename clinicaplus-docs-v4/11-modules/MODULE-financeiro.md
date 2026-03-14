# Módulo Financeiro — Especificação Completa

---

## 1. O Que Cobre

- Emissão de faturas (particular e seguro de saúde)
- Registo de pagamentos (dinheiro, TPA, transferência, seguro)
- Gestão do ciclo de reembolso de seguradoras
- Relatórios de receita (por médico, período, tipo)
- Export CSV compatível com Primavera

**Fora de âmbito (v3):** processamento automático de pagamentos, recibos fiscais AGT, contabilidade dupla entrada.

---

## 2. Numeração de Faturas

```
Formato: F-YYYY-NNNNN (5 dígitos, sequencial por clínica/ano)
Exemplos: F-2026-00001, F-2026-00042, F-2027-00001 (reinicia em jan)

Implementação (igual ao PatientNumberService da v1):
  findFirst WHERE numeroFatura LIKE 'F-2026-%' ORDER BY numeroFatura DESC
  → incrementar e padStart(5, '0')
  Idempotente — nunca usa transacção para isto (colisões impossíveis com um processo)
```

---

## 3. Seguradoras Suportadas

Configurável por clínica via `ConfiguracaoClinica`. Lista padrão:

```
ENSA, AAA Seguros, Medicel, Codil, Nossa Seguros, SAS, IMPAR
```

Clínicas podem adicionar seguradoras personalizadas — guardar como string livre.

---

## 4. Cálculo de Totais (Regras Absolutas)

```
NUNCA calcular no cliente — sempre calcular no service antes de guardar

ItemFatura.total = (precoUnit × quantidade) - desconto_item
Fatura.subtotal  = SUM(ItemFatura.total)
Fatura.total     = subtotal - desconto_global
totalPago        = SUM(Pagamento.valor WHERE faturaId = id)
Estado PAGA      ← quando totalPago >= Fatura.total (verificar após cada pagamento)
```

---

## 5. Permissões por Role

| Acção | PACIENTE | RECEP | MEDICO | ADMIN |
|-------|:--------:|:-----:|:------:|:-----:|
| Ver próprias faturas | ✅ | — | — | — |
| Ver todas as faturas | ❌ | ✅ | ❌ | ✅ |
| Criar fatura | ❌ | ✅ | ❌ | ✅ |
| Emitir fatura | ❌ | ✅ | ❌ | ✅ |
| Registar pagamento | ❌ | ✅ | ❌ | ✅ |
| Anular fatura | ❌ | ❌ | ❌ | ✅ |
| Ver relatório próprio | ❌ | ❌ | ✅ | ✅ |
| Ver relatório clínica | ❌ | ❌ | ❌ | ✅ |
| Export CSV | ❌ | ❌ | ❌ | ✅ (Pro+) |

---

## 6. Relatório de Receita — SQL

```sql
-- Incluir: EMITIDA + PAGA. Excluir: RASCUNHO, ANULADA
SELECT
  DATE_TRUNC(:agrupamento, f.data_emissao) AS periodo,
  f.medico_id,
  COUNT(*) AS consultas,
  SUM(f.total) AS receita,
  SUM(CASE WHEN f.tipo = 'SEGURO' AND sp.estado = 'PENDENTE' THEN f.total ELSE 0 END) AS seguros_pendentes
FROM faturas f
LEFT JOIN pagamentos p ON p.fatura_id = f.id
LEFT JOIN seguros_pagamento sp ON sp.pagamento_id = p.id
WHERE f.clinica_id = :clinicaId
  AND f.data_emissao BETWEEN :inicio AND :fim
  AND f.estado IN ('EMITIDA', 'PAGA')
GROUP BY DATE_TRUNC(:agrupamento, f.data_emissao), f.medico_id
ORDER BY periodo DESC
```

---

