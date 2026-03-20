# Reference — Enforcement em Três Camadas

## Camada 1 — requirePlan() middleware (API)

```typescript
// Uso obrigatório em TODOS os endpoints com feature gating
router.get('/relatorios/receita',       authenticate, requirePlan('PRO'),        handler);
router.post('/api-keys',               authenticate, requirePlan('PRO'),        handler);
router.get('/relatorios/receita/export', authenticate, requirePlan('PRO'),       handler);
router.post('/whatsapp/instancias',    authenticate, requirePlan('PRO'),        handler);
router.get('/multi-localizacao',       authenticate, requirePlan('ENTERPRISE'), handler);
```

**REGRA:** Qualquer endpoint que sirva uma feature da tabela de planos DEVE ter `requirePlan()`.
Não confiar apenas no `PlanGate` da UI — a API deve ser a última linha de defesa.

## Camada 2 — PlanGate (UI)

```tsx
// Em pages que requerem plano superior — envolve o conteúdo
<PlanGate planoMinimo="PRO">
  <RelatoriosPage />
</PlanGate>

// Para features dentro de uma página
<PlanGate planoMinimo="PRO" fallback={<UpgradeInline feature="Export CSV" />}>
  <button onClick={exportarCsv}>Exportar CSV</button>
</PlanGate>
```

**REGRA:** PlanGate é UX — não é segurança. Nunca omitir requirePlan() na API.

## Camada 3 — verificarLimite() antes de criar recursos

```typescript
// Em QUALQUER service que cria um recurso limitado por plano:
async criarMedico(clinicaId: string, dados: CriarMedicoInput) {
  await subscricaoService.verificarLimite(clinicaId, 'medicos'); // ← OBRIGATÓRIO
  return prisma.medico.create({ data: { ...dados, clinicaId } });
}

async criarAgendamento(clinicaId: string, dados: CriarAgendamentoInput) {
  await subscricaoService.verificarLimite(clinicaId, 'consultas'); // ← OBRIGATÓRIO
  return prisma.agendamento.create({ data: { ...dados, clinicaId } });
}
```

## Mapeamento features → requirePlan

| Feature | Middleware |
|---------|-----------|
| Relatórios histórico > 1 mês | `requirePlan('PRO')` |
| Export CSV | `requirePlan('PRO')` |
| API Keys (criar/listar) | `requirePlan('PRO')` |
| Webhooks (criar/listar) | `requirePlan('PRO')` |
| WhatsApp automações | `requirePlan('PRO')` |
| Multi-localização | `requirePlan('ENTERPRISE')` |
| Suporte via chat | `requirePlan('ENTERPRISE')` |
