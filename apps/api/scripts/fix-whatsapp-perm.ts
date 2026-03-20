import { PrismaClient, Papel } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('🚀 Iniciando correção de permissões do WhatsApp...');

  try {
    // 1. Garantir que a permissão existe
    const permissao = await prisma.permissao.upsert({
      where: { codigo: 'whatsapp:manage' },
      create: {
        codigo: 'whatsapp:manage',
        descricao: 'Gerir instâncias e automações de WhatsApp',
        modulo: 'plataforma',
      },
      update: {},
    });

    console.log(`✅ Permissão '${permissao.codigo}' garantida.`);

    // 2. Atribuir ao papel ADMIN
    await prisma.rolePermissao.upsert({
      where: {
        papel_permissaoId: {
          papel: Papel.ADMIN,
          permissaoId: permissao.id,
        },
      },
      create: {
        papel: Papel.ADMIN,
        permissaoId: permissao.id,
      },
      update: {},
    });

    console.log(`✅ Permissão atribuída ao papel ADMIN.`);

    // 3. Atribuir ao papel SUPER_ADMIN (just in case)
    await prisma.rolePermissao.upsert({
      where: {
        papel_permissaoId: {
          papel: Papel.SUPER_ADMIN,
          permissaoId: permissao.id,
        },
      },
      create: {
        papel: Papel.SUPER_ADMIN,
        permissaoId: permissao.id,
      },
      update: {},
    });

    console.log(`✅ Permissão atribuída ao papel SUPER_ADMIN.`);
    console.log('🎉 Correção concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao corrigir permissões:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
