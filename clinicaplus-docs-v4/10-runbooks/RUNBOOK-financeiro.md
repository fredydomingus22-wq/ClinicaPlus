# Runbook: Módulo Financeiro

---

## 1. Fatura em Duplicado

```
Sintoma:  dois números de fatura para o mesmo agendamento
Causa:    duplo click no submit ou retry de rede com sucesso parcial
Diagnóstico: GET /faturas?agendamentoId=X → retorna mais de um registo?

Resolução:
  1. PATCH /faturas/:id-duplicado/anular { "motivo": "Fatura duplicada — anulada manualmente" }
  2. Confirmar que a fatura correcta continua EMITIDA ou PAGA
  3. Nota: agendamentoId tem @unique → só pode acontecer se uma fatura foi anulada antes
  4. Prevenção: botão submit disabled durante loading + @unique no schema

Prevenção no frontend:
  const [submitting, setSubmitting] = useState(false);
  // submit → setSubmitting(true) → await → setSubmitting(false)
  <Button disabled={submitting}>Emitir</Button>
```

---

## 2. Reconciliação Mensal de Seguros

```
Processo mensal (último dia útil do mês):

1. Exportar faturas SEGURO do mês:
   GET /relatorios/receita/export?dataInicio=YYYY-MM-01&dataFim=YYYY-MM-31&tipo=SEGURO

2. Comparar com extracto recebido da seguradora

3. Para cada divergência:
   a. Valor aprovado diferente do solicitado:
      PATCH /pagamentos/:id/seguro { "estado": "APROVADO", "valorAprovado": X }

   b. Pedido rejeitado:
      PATCH /pagamentos/:id/seguro { "estado": "REJEITADO", "notasSeguradora": "motivo" }
      → recepcionista contacta paciente para pagamento particular
      → registar novo Pagamento com metodo=DINHEIRO ou TPA

   c. Reembolso recebido:
      PATCH /pagamentos/:id/seguro { "estado": "REEMBOLSADO" }

4. Faturas com seguros PENDENTES há > 30 dias: verificar com a seguradora
```

---

## 3. Fatura Anulada por Engano

```
Faturas ANULADAS são terminais — não podem ser reactivadas.
Isto é intencional (audit trail limpo).

Resolução:
  1. Criar nova fatura com os mesmos dados
  2. Associar ao mesmo agendamento (se o campo agendamentoId ficou livre com a anulação)
  3. A fatura original permanece como ANULADA no histórico

Nota: se a fatura PAGA for anulada, os pagamentos associados ficam no DB mas
a fatura passa a ANULADA. Criar nova fatura e registar que já foi paga.
```

---

## 4. Export para Contabilidade Primavera

```
Endpoint: GET /relatorios/receita/export (plano PRO+)
Formato:  CSV, separador ponto-e-vírgula, BOM UTF-8, encoding UTF-8

Colunas esperadas pelo Primavera:
  Data;Número;NIF;Nome Cliente;Descrição;Qtd;Preço Unit (Kz);Desconto (Kz);Total (Kz);IVA%

Nota IVA: serviços de saúde em Angola são isentos de IVA → coluna IVA sempre 0

Como abrir no Excel (Angola):
  1. Arquivo → Abrir → seleccionar o CSV
  2. Delimitador: ponto-e-vírgula
  3. Codificação: UTF-8
  (O BOM garante que o Excel detecta UTF-8 automaticamente)
```
