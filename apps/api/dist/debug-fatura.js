"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const faturaId = 'cmpd11ju00001115gx8q0xa6i';
    console.log(`Buscando fatura ${faturaId}...`);
    try {
        const fatura = await prisma.fatura.findUnique({
            where: { id: faturaId },
            include: {
                itens: true,
                pagamentos: { include: { seguro: true } },
                paciente: true,
                medico: true,
            }
        });
        if (!fatura) {
            console.log('Fatura não encontrada!');
            return;
        }
        console.log('FATURA ENCONTRADA:');
        console.log(JSON.stringify(fatura, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
        // Testar o mapeamento
        console.log('\nTestando toISOString em datas:');
        console.log('criadoEm:', fatura.criadoEm?.toISOString());
        console.log('atualizadoEm:', fatura.atualizadoEm?.toISOString());
        console.log('dataEmissao:', fatura.dataEmissao?.toISOString());
        console.log('\nTestando pagamentos:');
        fatura.pagamentos.forEach((p, i) => {
            console.log(`Pagamento ${i}: criadoEm =`, p.criadoEm?.toISOString());
        });
    }
    catch (error) {
        console.error('Erro ao buscar fatura:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
