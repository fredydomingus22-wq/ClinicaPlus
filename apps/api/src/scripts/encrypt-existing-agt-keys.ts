import { prisma } from '../lib/prisma';
import { encryptSecret } from '../lib/secretCrypto';
import { logger } from '../lib/logger';

/**
 * Script para encriptar chaves AGT existentes no DB que não estão encriptadas.
 * Chaves encriptadas começam com 'v1:'.
 */
async function encryptExistingAgtKeys(): Promise<void> {
  logger.info('🔐 Iniciando encriptação de chaves AGT existentes...');

  try {
    // Buscar clínicas com chaves AGT não encriptadas
    const clinicas = await prisma.clinica.findMany({
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
      const updates: Record<string, string> = {};

      // Encriptar agtPrivateKey se não estiver encriptado
      if (clinica.agtPrivateKey && !clinica.agtPrivateKey.startsWith('v1:')) {
        updates.agtPrivateKey = encryptSecret(clinica.agtPrivateKey);
        logger.info(`Encriptando agtPrivateKey para clínica: ${clinica.nome}`);
      }

      // Encriptar agtPublicKey se não estiver encriptado
      if (clinica.agtPublicKey && !clinica.agtPublicKey.startsWith('v1:')) {
        updates.agtPublicKey = encryptSecret(clinica.agtPublicKey);
        logger.info(`Encriptando agtPublicKey para clínica: ${clinica.nome}`);
      }

      // Atualizar se houver mudanças
      if (Object.keys(updates).length > 0) {
        await prisma.clinica.update({
          where: { id: clinica.id },
          data: updates
        });
        updatedCount++;
      }
    }

    logger.info(`✅ Encriptação concluída. ${updatedCount} clínicas atualizadas.`);
  } catch (err) {
    logger.error({ err }, '❌ Erro ao encriptar chaves AGT');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

encryptExistingAgtKeys();
