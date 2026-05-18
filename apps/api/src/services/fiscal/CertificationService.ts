import { CertificationService as BaseCertificationService } from '@clinicaplus/utils/server';
import { AppError } from '@clinicaplus/utils';
import { prisma } from '../../lib/prisma';

export class CertificationService extends BaseCertificationService {
  /**
   * Obtém o hash do documento anterior na mesma série para construir a cadeia.
   * Requer transação activa para garantir precisão atómica.
   * 
   * @param clinicaId ID da Clínica
   * @param serieDocFiscal Série (ex: CPLS)
   * @param tipoDocFiscal Tipo (ex: FT, NC)
   * @param tx Objeto PrismaTransaction
   * @returns O hash do documento anterior ou string vazia se for o primeiro
   */
  async obterHashAnterior(
    clinicaId: string,
    serieDocFiscal: string,
    tipoDocFiscal: string,
    tx: any // PrismaTransaction
  ): Promise<string> {
    const lastDoc = await tx.fatura.findFirst({
      where: {
        clinicaId,
        serieDocFiscal,
        tipoDocFiscal,
        estado: { not: 'RASCUNHO' }
      },
      orderBy: {
        numeroFatura: 'desc'
      },
      select: {
        fiscalHash: true
      }
    });

    return lastDoc?.fiscalHash || '';
  }
}

export const certificationService = new CertificationService();
