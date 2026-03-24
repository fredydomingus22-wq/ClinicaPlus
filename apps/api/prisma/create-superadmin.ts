import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Criando Super Admin Global...');

  const email = 'domi94665@gmail.com';
  const password = '12345678';
  const passwordHash = await bcrypt.hash(password, 12);

  // 1. Procurar utilizador existente pelo email
  const existingUser = await prisma.utilizador.findFirst({
    where: { email }
  });

  if (existingUser) {
    console.log(`ℹ️ Utilizador já existe, actualizando para Super Admin Global...`);
    await prisma.utilizador.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        papel: 'SUPER_ADMIN',
        clinicaId: null, // Global!
        nome: 'Domi Super Admin'
      }
    });
  } else {
    console.log(`🆕 Criando novo Super Admin Global...`);
    await prisma.utilizador.create({
      data: {
        email,
        passwordHash,
        papel: 'SUPER_ADMIN',
        clinicaId: null, // Global!
        nome: 'Domi Super Admin'
      }
    });
  }

  console.log(`✅ Super Admin Global criado com sucesso: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🛡️  Status: Sem vínculo a clínica (Global)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
