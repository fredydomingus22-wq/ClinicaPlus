import { PrismaClient, Plano } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding plan limits...');

  const limits = [
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

  for (const limit of limits) {
    await prisma.planoLimite.upsert({
      where: { plano: limit.plano },
      update: limit,
      create: limit,
    });
  }

  console.log('Plan limits seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
