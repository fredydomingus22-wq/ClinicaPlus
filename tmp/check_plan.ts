import { PrismaClient, Plano } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const clinica = await prisma.clinica.findFirst();
  if (clinica) {
    console.log('Clínica encontrada:', clinica.nome, 'Plano:', clinica.plano);
    if (clinica.plano !== Plano.PRO && clinica.plano !== Plano.ENTERPRISE) {
      console.log('A atualizar plano para PRO...');
      await prisma.clinica.update({
        where: { id: clinica.id },
        data: { plano: Plano.PRO }
      });
      console.log('Plano atualizado com sucesso.');
    }
  } else {
    console.log('Nenhuma clínica encontrada.');
  }

  // Permissões
  const superAdminRole = await prisma.papel.findFirst({ where: { nome: 'Super Admin' } });
  if (superAdminRole) {
    console.log('Papel Super Admin encontrado.');
  }

  await prisma.$disconnect();
}
check().catch(console.error);
