import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clinica = await prisma.clinica.findUnique({
    where: { id: 'cmp7fwrjo0000wv67v49abpdq' },
    select: { nif: true, razaoSocial: true, enderecoPostal: true }
  });
  console.log('CLINICA_DATA:', JSON.stringify(clinica, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
