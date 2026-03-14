# SKILL: Módulo Financeiro

Lê antes de faturas, pagamentos, seguros, relatórios, ou export financeiro.
Referência: `docs/11-modules/MODULE-financeiro.md`

---

## Regras de Ouro

```
1. Integer Kwanza em tudo — zero floats, zero arredondamentos
2. Calcular totais no service (não no cliente, não na route)
3. Estado avança só via service method — nunca prisma.update({ estado }) directo
4. Enfileirar DEPOIS do DB confirmar (publishEvent, webhookQueue)
5. Faturas ANULADAS são terminais — criar nova em vez de reactivar
6. Relatório: incluir EMITIDA + PAGA, excluir RASCUNHO e ANULADA
```

## Cálculo de Totais

```typescript
const subtotal = data.itens.reduce((s, i) => s + (i.precoUnit * i.quantidade) - i.desconto, 0);
const total    = subtotal - (data.desconto ?? 0);
// Guardar subtotal e total no DB — nunca recalcular on-the-fly
```

## Numeração

```typescript
// F-YYYY-NNNNN — igual ao PatientNumberService
const prefixo = `F-${ano}-`;
const ultima = await prisma.fatura.findFirst({
  where: { clinicaId, numeroFatura: { startsWith: prefixo } },
  orderBy: { numeroFatura: 'desc' },
});
const seq = ultima ? parseInt(ultima.numeroFatura.split('-')[2]) + 1 : 1;
return `${prefixo}${String(seq).padStart(5, '0')}`;
```

## Checklist

- [ ] `formatKwanza()` em 100% dos valores exibidos na UI
- [ ] `planEnforcementService.check()` antes de criar fatura (quota de consultas)
- [ ] `auditLogService.log()` em CREATE, EMITIR, VOID, PAGAMENTO
- [ ] Export CSV: BOM `\uFEFF` + separador `;` + encoding UTF-8

---

