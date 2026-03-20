import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clinica = await prisma.clinica.findUnique({
    where: { slug: 'nutrimacho-ao' },
  });
  
  if (!clinica) {
    console.log('Clínica nutrimacho-ao not found!');
  } else {
    console.log('Clínica found:', clinica);
    const users = await prisma.utilizador.findMany({
      where: { clinicaId: clinica.id, papel: 'ADMIN' },
    });
    console.log('Admins for nutrimacho-ao:', users);
  }
}

main().finally(() => prisma.$disconnect());
