"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const secretCrypto_1 = require("../lib/secretCrypto");
const logger_1 = require("../lib/logger");
/**
 * Script para encriptar chaves AGT existentes no DB que não estão encriptadas.
 * Chaves encriptadas começam com 'v1:'.
 */
async function encryptExistingAgtKeys() {
    logger_1.logger.info('🔐 Iniciando encriptação de chaves AGT existentes...');
    try {
        // Buscar clínicas com chaves AGT não encriptadas
        const clinicas = await prisma_1.prisma.clinica.findMany({
            where: {
                OR: [
                    { agtPrivateKey: { not: null } },
                    { agtPublicKey: { not: null } }
                ]
            },
            select: {
                id: true,
                nome: true,
                agtPrivateKey: true,
                agtPublicKey: true,
            }
        });
        let updatedCount = 0;
        for (const clinica of clinicas) {
            const updates = {};
            // Encriptar agtPrivateKey se não estiver encriptado
            if (clinica.agtPrivateKey && !clinica.agtPrivateKey.startsWith('v1:')) {
                updates.agtPrivateKey = (0, secretCrypto_1.encryptSecret)(clinica.agtPrivateKey);
                logger_1.logger.info(`Encriptando agtPrivateKey para clínica: ${clinica.nome}`);
            }
            // Encriptar agtPublicKey se não estiver encriptado
            if (clinica.agtPublicKey && !clinica.agtPublicKey.startsWith('v1:')) {
                updates.agtPublicKey = (0, secretCrypto_1.encryptSecret)(clinica.agtPublicKey);
                logger_1.logger.info(`Encriptando agtPublicKey para clínica: ${clinica.nome}`);
            }
            // Atualizar se houver mudanças
            if (Object.keys(updates).length > 0) {
                await prisma_1.prisma.clinica.update({
                    where: { id: clinica.id },
                    data: updates
                });
                updatedCount++;
            }
        }
        logger_1.logger.info(`✅ Encriptação concluída. ${updatedCount} clínicas atualizadas.`);
    }
    catch (err) {
        logger_1.logger.error({ err }, '❌ Erro ao encriptar chaves AGT');
        process.exit(1);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
encryptExistingAgtKeys();
