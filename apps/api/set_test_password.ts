import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  await prisma.utilizador.updateMany({
    where: { email: 'contacto.naturamed@gmail.com' },
    data: { passwordHash },
  });
  
  console.log('Password updated to Demo1234!');
}

main().finally(() => prisma.$disconnect());
