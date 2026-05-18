const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Criando tipo WaTipoIntegracao...');
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "WaTipoIntegracao" AS ENUM ('BAILEYS', 'META_CLOUD');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('Adicionando colunas a wa_instancias...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE wa_instancias 
      ADD COLUMN IF NOT EXISTS "tipoIntegracao" "WaTipoIntegracao" NOT NULL DEFAULT 'BAILEYS',
      ADD COLUMN IF NOT EXISTS "metaPhoneNumberId" TEXT,
      ADD COLUMN IF NOT EXISTS "metaWabaId" TEXT,
      ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;
    `);

    console.log('Migração manual concluída com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
