import { PrismaClient, Plano } from '@prisma/client';

export async function seedPlanoLimites(prisma: PrismaClient): Promise<void> {
  const limites = [
    {
      plano: Plano.BASICO,
      maxMedicos: 2,
      maxConsultasMes: 100,
      maxPacientes: 500,
      apiKeyPermitido: false,
      maxApiKeys: 0,
      webhookPermitido: false,
      maxWebhooks: 0,
      relatoriosHist: false,
      exportPermitido: false,
    },
    {
      plano: Plano.PRO,
      maxMedicos: 10,
      maxConsultasMes: -1,
      maxPacientes: -1,
      apiKeyPermitido: true,
      maxApiKeys: 3,
      webhookPermitido: true,
      maxWebhooks: 5,
      relatoriosHist: true,
      exportPermitido: true,
    },
    {
      plano: Plano.ENTERPRISE,
      maxMedicos: -1,
      maxConsultasMes: -1,
      maxPacientes: -1,
      apiKeyPermitido: true,
      maxApiKeys: -1,
      webhookPermitido: true,
      maxWebhooks: -1,
      relatoriosHist: true,
      exportPermitido: true,
    },
  ];

  for (const l of limites) {
    await prisma.planoLimite.upsert({
      where: { plano: l.plano },
      create: l,
      update: l,
    });
  }
}
