
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clinica = await prisma.clinica.findFirst({
    orderBy: { criadoEm: 'desc' },
    include: {
      subscricoes: {
        orderBy: { criadoEm: 'desc' },
        take: 1
      }
    }
  });

  console.log('--- ÚLTIMA CLÍNICA CRIADA ---');
  console.log('ID:', clinica?.id);
  console.log('Nome:', clinica?.nome);
  console.log('Plano:', clinica?.plano);
  console.log('Estado:', clinica?.subscricaoEstado);
  console.log('Válido até:', clinica?.subscricaoValidaAte);
  console.log('Data Actual (Sistema):', new Date());
  
  if (clinica?.subscricoes?.[0]) {
    const sub = clinica.subscricoes[0];
    console.log('\n--- ÚLTIMA SUBSCRICAO ---');
    console.log('Plano:', sub.plano);
    console.log('Estado:', sub.estado);
    console.log('Válido até:', sub.validaAte);
    console.log('Razão:', sub.razao);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
