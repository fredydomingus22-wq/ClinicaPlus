import { prisma } from '../../lib/prisma';
import { agtApiClient } from './AgtApiClient';
import { faturasService } from '../faturas.service';
import { CertificationService } from './CertificationService';
import { logger } from '../../lib/logger';
import {
  getDefaultAgtSoftwareInfoDetail,
  requireAgtBasicAuthFromEnvOrEmptyWhenMock,
  resolveAgtTenantKeys,
} from '@clinicaplus/utils/server';
import crypto from 'crypto';
import { decryptSecret } from '../../lib/secretCrypto';

export class ContingencySyncService {
  /**
   * Periodic job that drains the contingency queue for one clinic.
   */
  public async syncPendingDocuments(clinicaId: string): Promise<void> {
    const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) return;

    if (!clinica.nif) {
      logger.error({ clinicaId }, 'Clinica sem NIF configurado. Sincronizacao de contingencia bloqueada.');
      return;
    }

    const faturasPendentes = await prisma.fatura.findMany({
      where: { clinicaId, statusEnvio: 'CONTINGENCIA', emContingencia: true },
      orderBy: { criadoEm: 'asc' }
    });

    const seriesPendentes = new Map<string, {
      serie: string;
      tipoDoc: typeof faturasPendentes[number]['tipoDocFiscal'];
      anoFiscal: number;
      startTS: Date;
      endTS: Date;
    }>();

    // When a dedicated contingency series exists (suffix C), register that AGT series
    // instead of also registering the normal series that triggered failover.
    const faturasComSerieContingencia = faturasPendentes.filter((fatura) => fatura.serieDocFiscal.endsWith('C'));
    const faturasParaRegistoSerie = faturasComSerieContingencia.length > 0 ? faturasComSerieContingencia : faturasPendentes;

    for (const fatura of faturasParaRegistoSerie) {
      const key = `${fatura.serieDocFiscal}:${fatura.tipoDocFiscal}`;
      const actual = seriesPendentes.get(key);
      const startTS = actual && actual.startTS < fatura.criadoEm ? actual.startTS : fatura.criadoEm;
      const endTS = actual && actual.endTS > fatura.criadoEm ? actual.endTS : fatura.criadoEm;

      seriesPendentes.set(key, {
        serie: fatura.serieDocFiscal,
        tipoDoc: fatura.tipoDocFiscal,
        anoFiscal: fatura.criadoEm.getFullYear(),
        startTS,
        endTS
      });
    }

    const seriesContingentes = [];
    for (const seriePendente of seriesPendentes.values()) {
      const existente = await prisma.sequenciaDocFiscal.findFirst({
        where: {
          clinicaId,
          serie: seriePendente.serie,
          tipoDoc: seriePendente.tipoDoc,
          anoFiscal: seriePendente.anoFiscal
        }
      });

      if (existente?.isRegistered) continue;

      if (existente) {
        const normalizada = await prisma.sequenciaDocFiscal.update({
          where: { id: existente.id },
          data: {
            isContingency: true,
            isRegistered: false,
            startTS: existente.startTS ?? seriePendente.startTS,
            endTS: null
          }
        });
        seriesContingentes.push(normalizada);
      } else {
        const criada = await prisma.sequenciaDocFiscal.create({
          data: {
            clinicaId,
            serie: seriePendente.serie,
            tipoDoc: seriePendente.tipoDoc,
            anoFiscal: seriePendente.anoFiscal,
            isContingency: true,
            isRegistered: false,
            startTS: seriePendente.startTS,
            endTS: null
          }
        });
        seriesContingentes.push(criada);
      }
    }

    const tenantKeys = resolveAgtTenantKeys(clinica, decryptSecret);
    const certService = new CertificationService(tenantKeys);

    for (const serie of seriesContingentes) {
      try {
        const lastDoc = await prisma.fatura.findFirst({
          where: { clinicaId, serieDocFiscal: serie.serie, tipoDocFiscal: serie.tipoDoc as any },
          orderBy: { criadoEm: 'desc' }
        });

        const endTS = lastDoc ? lastDoc.criadoEm : new Date();
        const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();
        const seriesContingencyIndicator = 'C';

        const request = {
          schemaVersion: '1.2',
          submissionUUID: crypto.randomUUID(),
          taxRegistrationNumber: clinica.nif,
          submissionTimeStamp: new Date().toISOString(),
          establishmentNumber: 'SEDE',
          seriesYear: serie.anoFiscal.toString(),
          documentType: serie.tipoDoc,
          seriesContingencyIndicator,
          seriesStartTS: (serie.startTS ?? endTS).toISOString(),
          seriesEndTS: endTS.toISOString(),
          softwareInfo: {
            softwareInfoDetail,
            jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
          },
          jwsSignature: certService.signRequestJWS({
            taxRegistrationNumber: clinica.nif,
            establishmentNumber: 'SEDE',
            seriesYear: serie.anoFiscal.toString(),
            documentType: serie.tipoDoc,
            seriesContingencyIndicator
          })
        };

        await agtApiClient.solicitarSerie(request as any, requireAgtBasicAuthFromEnvOrEmptyWhenMock());

        await prisma.sequenciaDocFiscal.update({
          where: { id: serie.id },
          data: { isRegistered: true, isContingency: false, endTS }
        });

        logger.info({ serie: serie.serie }, 'Serie de contingencia registada na AGT com sucesso');
      } catch (error) {
        logger.error({ error, serie: serie.serie }, 'Erro ao registar serie de contingencia na AGT');
        return;
      }
    }

    for (const fatura of faturasPendentes) {
      try {
        await faturasService.submeterParaAgt(fatura.id, clinicaId);

        const faturaAtual = await prisma.fatura.findUnique({
          where: { id: fatura.id },
          select: { statusEnvio: true }
        });

        if (faturaAtual?.statusEnvio === 'ENTREGUE' || faturaAtual?.statusEnvio === 'ENVIADO') {
          logger.info({ faturaId: fatura.id, statusEnvio: faturaAtual.statusEnvio }, 'Fatura em contingencia submetida com sucesso');
        } else {
          logger.warn({ faturaId: fatura.id, statusEnvio: faturaAtual?.statusEnvio }, 'Fatura em contingencia ainda nao foi totalmente sincronizada');
        }
      } catch (err) {
        logger.error({ err, faturaId: fatura.id }, 'Erro ao sincronizar fatura tardia da contingencia');
      }
    }

    const restamPendentes = await prisma.fatura.count({
      where: { clinicaId, statusEnvio: 'CONTINGENCIA', emContingencia: true }
    });

    if (restamPendentes === 0) {
      logger.info({ clinicaId }, 'Todas as faturas em contingencia foram sincronizadas. Finalizando periodo de contingencia.');
      await prisma.sequenciaDocFiscal.updateMany({
        where: { clinicaId, isContingency: true },
        data: {
          isContingency: false,
          isRegistered: true,
          endTS: new Date()
        }
      });
    }
  }

  /**
   * Sync all clinics with pending contingency documents.
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
      logger.error({ error }, 'Erro ao rodar syncAllPending de contingencia');
    }
  }
}

export const contingencySyncService = new ContingencySyncService();
