# Reference — Ciclo de Vida de Subscrições

## Transições válidas

```
TRIAL        → ACTIVA         (Super Admin confirma pagamento)
TRIAL        → BASICO/ACTIVA  (trial expirou — job automático)
ACTIVA       → GRACE_PERIOD   (validaAte passou — job automático)
ACTIVA       → CANCELADA      (cancelamento a pedido)
GRACE_PERIOD → ACTIVA         (pagamento recebido antes do dia 8)
GRACE_PERIOD → SUSPENSA       (dia 8+ sem pagamento — job automático)
SUSPENSA     → ACTIVA         (reactivação após pagamento)
CANCELADA    → ACTIVA         (reactivação — raro)
```

## Transições INVÁLIDAS (nunca implementar)

```
SUSPENSA → TRIAL           ❌  não faz sentido
CANCELADA → TRIAL          ❌  não faz sentido
qualquer → editar registo  ❌  subscrição é imutável
```

## Seed obrigatório — plano_limites

```typescript
// apps/api/src/seeds/plano-limites.seed.ts
const limites = [
  {
    plano: 'BASICO',
    maxMedicos: 2, maxConsultasMes: 100, maxPacientes: 500,
    maxApiKeys: 0, apiKey: false, webhooks: false, maxWebhooks: 0,
    exportCsv: false, multiLocalizacao: false, relatoriosHistoricoMeses: 1,
    backupDiario: false, auditLogDias: 30,
  },
  {
    plano: 'PRO',
    maxMedicos: 10, maxConsultasMes: -1, maxPacientes: -1,
    maxApiKeys: 3, apiKey: true, webhooks: true, maxWebhooks: 5,
    exportCsv: true, multiLocalizacao: false, relatoriosHistoricoMeses: 12,
    backupDiario: true, auditLogDias: 365,
  },
  {
    plano: 'ENTERPRISE',
    maxMedicos: -1, maxConsultasMes: -1, maxPacientes: -1,
    maxApiKeys: -1, apiKey: true, webhooks: true, maxWebhooks: -1,
    exportCsv: true, multiLocalizacao: true, relatoriosHistoricoMeses: -1,
    backupDiario: true, auditLogDias: 730,
  },
];

for (const l of limites) {
  await prisma.planoLimite.upsert({
    where: { plano: l.plano },
    create: l,
    update: l,
  });
}
```

## Criar subscrição de trial para nova clínica

```typescript
// Chamado em clinicaService.create() logo após criar a clínica
await subscricaoService.criarNovaSubscricao({
  clinicaId: novaClinica.id,
  plano:     'BASICO',
  estado:    'TRIAL',
  validaAte: addDays(new Date(), 14),
  razao:     'TRIAL_EXPIRADO', // razão usada quando o trial converter
  alteradoPor: 'sistema',
  notas:     'Trial automático de 14 dias',
});
```
