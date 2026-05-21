import { prisma } from '../../lib/prisma';
import { agtApiClient } from './AgtApiClient';
import { faturasService } from '../faturas.service';
import { CertificationService } from './CertificationService';
import { logger } from '../../lib/logger';
import crypto from 'crypto';

function getAgtAuthToken(): string {
  if (process.env.AGT_USERNAME && process.env.AGT_PASSWORD) {
    return `${process.env.AGT_USERNAME}:${process.env.AGT_PASSWORD}`;
  }
  return '';
}

export class ContingencySyncService {
  
  /**
   * Job que roda periodicamente para limpar a fila de contingência
   */
  public async syncPendingDocuments(clinicaId: string): Promise<void> {
    // 1. Buscar todas as séries de contingência não registadas
    const seriesContingentes = await prisma.sequenciaDocFiscal.findMany({
      where: { clinicaId, isContingency: true, isRegistered: false }
    });

    const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) return;

    const certService = new CertificationService({
      tenantPrivateKey: clinica.agtPrivateKey || undefined,
      tenantPublicKey: clinica.agtPublicKey || undefined
    });

    // 2. Registar cada série na AGT marcando como contingência ('C')
    for (const serie of seriesContingentes) {
      try {
        const lastDoc = await prisma.fatura.findFirst({
          where: { clinicaId, serieDocFiscal: serie.serie, tipoDocFiscal: serie.tipoDoc as any },
          orderBy: { criadoEm: 'desc' }
        });

        const endTS = lastDoc ? lastDoc.criadoEm : new Date();

        // payload para registrar série na AGT
        const request = {
          schemaVersion: '1.2',
          submissionUUID: crypto.randomUUID(),
          taxRegistrationNumber: clinica.nif!,
          submissionTimeStamp: new Date().toISOString(),
          establishmentNumber: 'SEDE',
          seriesYear: serie.anoFiscal.toString(),
          documentType: serie.tipoDoc,
          seriesContingencyIndicator: 'C', // ATIVA O INDICADOR DE CONTINGÊNCIA
          seriesStartTS: serie.startTS?.toISOString(), // Início do offline
          seriesEndTS: endTS.toISOString(),             // Fim do offline
          softwareInfo: {
            softwareInfoDetail: {
              productId: 'DocAgen',
              productVersion: '1.0.0',
              softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
              signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
            },
            jwsSoftwareSignature: certService.signSoftwareJWS({
              productId: 'DocAgen',
              productVersion: '1.0.0',
              softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
              signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
            })
          },
          jwsSignature: certService.signRequestJWS({
            taxRegistrationNumber: clinica.nif!,
            establishmentNumber: 'SEDE',
            seriesYear: serie.anoFiscal.toString(),
            documentType: serie.tipoDoc
          })
        };

        // Solicitar/comunicar série de contingência na AGT
        await agtApiClient.solicitarSerie(request as any, getAgtAuthToken());
        
        // Atualizar base de dados
        await prisma.sequenciaDocFiscal.update({
          where: { id: serie.id },
          data: { isRegistered: true, endTS }
        });

        logger.info({ serie: serie.serie }, 'Série de contingência registada na AGT com sucesso');
      } catch (error) {
        logger.error({ error, serie: serie.serie }, 'Erro ao registar série de contingência na AGT');
        return; // Bloqueia o envio dos documentos até a série ser registada
      }
    }

    // 3. Submeter as faturas acumuladas da série de contingência
    const faturasPendentes = await prisma.fatura.findMany({
      where: { clinicaId, statusEnvio: 'CONTINGENCIA', emContingencia: true },
      orderBy: { criadoEm: 'asc' }
    });

    for (const fatura of faturasPendentes) {
      try {
        await faturasService.submeterParaAgt(fatura.id, clinicaId);
        
        // Se a submissão foi um sucesso, verificar se a fatura foi marcada como entregue
        const faturaAtual = await prisma.fatura.findUnique({
          where: { id: fatura.id },
          select: { statusEnvio: true }
        });
        
        if (faturaAtual?.statusEnvio === 'ENTREGUE') {
          logger.info({ faturaId: fatura.id }, 'Fatura em contingência submetida com sucesso');
        } else {
          logger.warn({ faturaId: fatura.id, statusEnvio: faturaAtual?.statusEnvio }, 'Fatura em contingência não foi totalmente sincronizada ainda');
        }
      } catch (err) {
        logger.error({ err, faturaId: fatura.id }, 'Erro ao sincronizar fatura tardia da contingência');
      }
    }

    // 4. Se não houver mais faturas pendentes de sincronização para esta clínica, finalizar o período de contingência nas sequências!
    const restamPendentes = await prisma.fatura.count({
      where: { clinicaId, statusEnvio: 'CONTINGENCIA', emContingencia: true }
    });

    if (restamPendentes === 0) {
      logger.info({ clinicaId }, 'Todas as faturas em contingência foram sincronizadas. Finalizando o período de contingência.');
      await prisma.sequenciaDocFiscal.updateMany({
        where: { clinicaId, isContingency: true, endTS: null },
        data: {
          isContingency: false,
          endTS: new Date()
        }
      });
    }
  }

  /**
   * Sincroniza todas as clínicas pendentes
   */
  public async syncAllPending(): Promise<void> {
    try {
      const activeContingencies = await prisma.fatura.findMany({
        where: { statusEnvio: 'CONTINGENCIA' },
        distinct: ['clinicaId'],
        select: { clinicaId: true }
      });

      for (const item of activeContingencies) {
        await this.syncPendingDocuments(item.clinicaId);
      }
    } catch (error) {
      logger.error({ error }, 'Erro ao rodar syncAllPending de contingência');
    }
  }
}

export const contingencySyncService = new ContingencySyncService();
