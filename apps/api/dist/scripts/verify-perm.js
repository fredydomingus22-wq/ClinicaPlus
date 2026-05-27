"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function run() {
    console.log('🔍 Verificando permissões do papel ADMIN...');
    try {
        const rolePerm = await prisma.rolePermissao.findFirst({
            where: {
                papel: client_1.Papel.ADMIN,
                permissao: { codigo: 'whatsapp:manage' }
            },
            include: { permissao: true }
        });
        if (rolePerm) {
            console.log('✅ SUCESSO: O papel ADMIN tem a permissão whatsapp:manage.');
            console.log('Detalhes:', JSON.stringify(rolePerm, null, 2));
        }
        else {
            console.log('❌ FALHA: O papel ADMIN NÃO tem a permissão whatsapp:manage.');
        }
    }
    catch (error) {
        console.error('❌ Erro na verificação:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();
