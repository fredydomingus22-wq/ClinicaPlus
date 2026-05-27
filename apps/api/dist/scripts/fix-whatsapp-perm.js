"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
                    papel: client_1.Papel.ADMIN,
                    permissaoId: permissao.id,
                },
            },
            create: {
                papel: client_1.Papel.ADMIN,
                permissaoId: permissao.id,
            },
            update: {},
        });
        console.log(`✅ Permissão atribuída ao papel ADMIN.`);
        // 3. Atribuir ao papel SUPER_ADMIN (just in case)
        await prisma.rolePermissao.upsert({
            where: {
                papel_permissaoId: {
                    papel: client_1.Papel.SUPER_ADMIN,
                    permissaoId: permissao.id,
                },
            },
            create: {
                papel: client_1.Papel.SUPER_ADMIN,
                permissaoId: permissao.id,
            },
            update: {},
        });
        console.log(`✅ Permissão atribuída ao papel SUPER_ADMIN.`);
        console.log('🎉 Correção concluída com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro ao corrigir permissões:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();
