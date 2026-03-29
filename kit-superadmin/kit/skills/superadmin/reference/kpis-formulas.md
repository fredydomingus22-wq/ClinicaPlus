# Reference: KPIs — Fórmulas e Queries

## MRR Bridge (componente mais importante)

O MRR Bridge mostra como o MRR muda de mês para mês. É o indicador mais accionável.

```
MRR Ending = MRR Starting + New MRR + Expansion MRR - Contraction MRR - Churn MRR
```

```typescript
// services/superadmin.service.ts
async calcularMRRBridge(meses: number = 6): Promise<MRRBridgeItem[]> {
  const resultado: MRRBridgeItem[] = [];

  for (let i = meses; i >= 0; i--) {
    const mesAtual  = startOfMonth(subMonths(new Date(), i));
    const mesFim    = endOfMonth(mesAtual);
    const mesAnterior = subMonths(mesAtual, 1);

    // Clínicas activas no início do mês
    const clinicasInicio = await prisma.clinica.findMany({
      where: { criadoEm: { lte: mesAnterior }, suspensaEm: { OR: [null, { gte: mesAtual }] } },
      select: { id: true, plano: true },
    });

    // Clínicas novas este mês
    const clinicasNovas = await prisma.clinica.findMany({
      where: { criadoEm: { gte: mesAtual, lte: mesFim } },
      select: { plano: true },
    });

    // Clínicas que fizeram upgrade este mês
    const upgrades = await prisma.historicoPlano.findMany({
      where: { criadoEm: { gte: mesAtual, lte: mesFim }, tipo: 'UPGRADE' },
      select: { planAnterior: true, planNovo: true },
    });

    // Clínicas que fizeram downgrade
    const downgrades = await prisma.historicoPlano.findMany({
      where: { criadoEm: { gte: mesAtual, lte: mesFim }, tipo: 'DOWNGRADE' },
      select: { planAnterior: true, planNovo: true },
    });

    // Clínicas que cancelaram
    const cancelamentos = await prisma.clinica.findMany({
      where: { suspensaEm: { gte: mesAtual, lte: mesFim } },
      select: { plano: true },
    });

    const starting    = clinicasInicio.reduce((s, c) => s + PRECO[c.plano], 0);
    const newMRR      = clinicasNovas.reduce((s, c) => s + PRECO[c.plano], 0);
    const expansion   = upgrades.reduce((s, u) => s + (PRECO[u.planNovo] - PRECO[u.planAnterior]), 0);
    const contraction = downgrades.reduce((s, d) => s + (PRECO[d.planAnterior] - PRECO[d.planNovo]), 0);
    const churn       = cancelamentos.reduce((s, c) => s + PRECO[c.plano], 0);
    const ending      = starting + newMRR + expansion - contraction - churn;

    resultado.push({
      mes: format(mesAtual, 'MMM yy', { locale: pt }),
      starting, new: newMRR, expansion, contraction: -contraction, churn: -churn, ending,
    });
  }
  return resultado;
}

const PRECO: Record<string, number> = {
  BASICO:     2_500_000,  // 25.000 Kz
  PRO:        7_500_000,  // 75.000 Kz
  ENTERPRISE: 20_000_000, // 200.000 Kz
};
```

## Churn Rate

```typescript
// Churn de logos (clínicas)
const churnRate = (clinicasCanceladas30d / clinicasInicioMes) * 100;

// Revenue Churn (mais preciso)
const revenueChurn = (mrrPerdido / mrrInicio) * 100;

// Net Revenue Retention (NRR) — meta: > 100%
// NRR > 100% significa que expansion > churn
const nrr = ((mrrFinal - mrrNovo) / mrrInicio) * 100;
```

## Score de Saúde por Clínica

```typescript
// Score calculado diariamente (job nocturno ou on-demand)
function calcularScore(metricas: ClinicaMetricas): 'VERDE' | 'AMARELO' | 'VERMELHO' {
  const { erros24h, webhookFails24h, agendamentos7d, ultimaActividade } = metricas;

  // Criticamente vermelho
  if (erros24h >= 10) return 'VERMELHO';
  if (webhookFails24h >= 20) return 'VERMELHO';
  if (ultimaActividade && differenceInDays(new Date(), ultimaActividade) > 30) return 'VERMELHO';

  // Aviso
  if (erros24h >= 3) return 'AMARELO';
  if (webhookFails24h >= 5) return 'AMARELO';
  if (agendamentos7d === 0) return 'AMARELO'; // clínica inactiva

  return 'VERDE';
}
```

## ARPU e LTV

```typescript
// ARPU = Average Revenue Per User (clínica, neste caso)
const arpu = mrr / clinicasActivas;

// LTV = ARPU / Churn Rate mensal
// Se churn = 2%/mês → LTV = ARPU / 0.02 = 50 meses de receita
const ltv = arpu / (churnRateMensal / 100);

// LTV:CAC = LTV / Custo de Aquisição de Cliente
// Meta: > 3:1 (acima de 5:1 pode significar subinvestimento em marketing)
```
