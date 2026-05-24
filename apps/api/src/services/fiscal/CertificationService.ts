import { Prisma, TipoDocumentoFiscal as PrismaTipoDocFiscal } from '@prisma/client';
import { CertificationService as BaseCertificationService } from '@clinicaplus/utils/server';

export class CertificationService extends BaseCertificationService {
  constructor(keys?: { 
    producerPrivateKey?: string | undefined, 
    tenantPrivateKey?: string | undefined,
    tenantPublicKey?: string | undefined 
  }) {
    super(keys);
  }

  public verificarAssinatura(
    params: Parameters<BaseCertificationService['verificarAssinatura']>[0]
  ): boolean {
    if (super.verificarAssinatura(params)) return true;
    if (!process.env.AGT_PUBLIC_KEY) return false;

    const fallback = new BaseCertificationService({
      tenantPublicKey: process.env.AGT_PUBLIC_KEY,
    });

    return fallback.verificarAssinatura(params);
  }

  /**
   * Obtém o hash do documento anterior na mesma série para construir a cadeia.
   * Requer transação activa para garantir precisão atómica.
   * 
   * @param clinicaId ID da Clínica
   * @param serieDocFiscal Série (ex: CPLS)
   * @param tipoDocFiscal Tipo (ex: FT, NC)
   * @param tx Objeto PrismaTransaction proxy
   * @returns O hash do documento anterior ou string vazia se for o primeiro
   */
  async obterHashAnterior(
    clinicaId: string,
    serieDocFiscal: string,
    tipoDocFiscal: PrismaTipoDocFiscal,
    tx: Prisma.TransactionClient
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

  /**
   * Obtém o hash do recibo (RC) anterior.
   */
  async obterHashAnteriorRecibo(
    clinicaId: string,
    serieDocFiscal: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const lastRC = await tx.pagamento.findFirst({
      where: {
        clinicaId,
        fatura: { serieDocFiscal },
        numeroRecibo: { not: null }
      },
      orderBy: {
        numeroRecibo: 'desc'
      },
      select: {
        fiscalHash: true
      }
    });

    return lastRC?.fiscalHash || '';
  }
}
