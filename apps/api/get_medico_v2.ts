import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clinica = await prisma.clinica.findUnique({ where: { slug: 'nutrimacho-ao' } });
  if (!clinica) { console.log('Clinica not found'); return; }

  const medico = await prisma.utilizador.findFirst({
    where: { clinicaId: clinica.id, papel: 'MEDICO' }
  });

  console.log('Medico ID for Nutrimacho:', medico?.id);
  console.log('Clinica ID for Nutrimacho:', clinica.id);
}

main().finally(() => prisma.$disconnect());
