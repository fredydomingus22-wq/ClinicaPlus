import { prisma } from './lib/prisma';

async function main() {
  const id = 'cmmypfdcm000dea9zj10087kf';
  const automacao = await prisma.waAutomacao.findUnique({
    where: { id },
    include: { instancia: true }
  });
  console.log('--- AUTOMATION DETAILS ---');
  console.log(JSON.stringify(automacao, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
