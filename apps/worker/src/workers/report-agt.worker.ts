import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger as baseLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  agtApiClient,
  CertificationService,
  buildAgtRegistarFacturaPayload,
  buildAgtObterEstadoPayload,
  getDefaultAgtSoftwareInfoDetail,
  pollAgtSubmissionStatus,
  resolveCustomerCountry,
} from '@clinicaplus/utils/server';
import { AppError } from '@clinicaplus/utils';
import { JobNames, ReportAgtJob } from '@clinicaplus/events';
import * as crypto from 'crypto';

const logger = baseLogger.child({ worker: 'report-agt' });

function getAgtAuthToken(): string {
  if (process.env.AGT_USERNAME && process.env.AGT_PASSWORD) {
    return `${process.env.AGT_USERNAME}:${process.env.AGT_PASSWORD}`;
  }
  return '';
}

/**
 * Worker para reporte de faturas à AGT (e-Factura)
 */
export const reportAgtWorker = new Worker<ReportAgtJob>(
  JobNames.REPORT_AGT,
  async (job: Job<ReportAgtJob>) => {
    const { faturaId, clinicaId } = job.data;

    logger.info({ faturaId, clinicaId, attempt: job.attemptsMade + 1 }, 'Iniciando reporte de Fatura Electrónica');

    try {
      const fatura = await prisma.fatura.findUnique({
        where: { id: faturaId, clinicaId },
        include: {
          itens: true,
          snapshot: true,
          clinica: true,
        },
      });

      if (!fatura || !fatura.snapshot) {
        logger.error({ faturaId }, 'Fatura ou Snapshot não encontrado para reporte');
        return;
      }

      const apiToken = getAgtAuthToken();
      if (!apiToken && process.env.AGT_MOCK !== 'true') {
        throw new AppError('Token da API AGT não configurado', 400);
      }

      const certService = new CertificationService({
        tenantPrivateKey: fatura.clinica.agtPrivateKey || undefined,
        tenantPublicKey: fatura.clinica.agtPublicKey || undefined,
      });

      if (!fatura.clinica.nif) {
        throw new AppError('NIF da clínica não configurado para reporte AGT', 400);
      }

      const requestPayload = buildAgtRegistarFacturaPayload(
        {
          numeroFatura: fatura.numeroFatura!,
          tipoDocFiscal: fatura.tipoDocFiscal,
          dataEmissao: fatura.dataEmissao!,
          systemEntryDate: fatura.criadoEm,
          subtotal: fatura.subtotal,
          totalIva: fatura.totalIva,
          total: fatura.total,
          retencaoFonte: fatura.retencaoFonte,
          taxRegistrationNumber: fatura.clinica.nif,
          clienteNif: fatura.snapshot.clienteNif,
          clienteNome: fatura.snapshot.clienteNome,
          clienteCountry:
            fatura.snapshot.clienteCountry ||
            resolveCustomerCountry(fatura.snapshot.clienteNif),
          itens: fatura.itens.map((item) => ({
            id: item.id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            precoUnit: item.precoUnit,
            desconto: item.desconto,
            taxaIva: item.taxaIva,
            codigoIva: item.codigoIva,
          })),
        },
        certService,
        {
          submissionUUID: crypto.randomUUID(),
          softwareInfoDetail: getDefaultAgtSoftwareInfoDetail(),
          eacCode: process.env.AGT_EAC_CODE || '86201',
        }
      );

      const result = await agtApiClient.registarFactura(requestPayload, apiToken || '');

      const hasErrors = result.errorList && result.errorList.length > 0;
      let statusEnvio = hasErrors ? 'ERRO' : 'ENVIADO';

      if (!hasErrors && result.requestID) {
        try {
          const poll = await pollAgtSubmissionStatus(
            () =>
              agtApiClient.obterEstado(
                buildAgtObterEstadoPayload(fatura.clinica.nif!, result.requestID!, certService),
                apiToken || ''
              ),
            {
              maxAttempts: Number(process.env.AGT_POLL_MAX_ATTEMPTS || 5),
            }
          );
          statusEnvio = poll.status;
        } catch (pollError) {
          logger.warn(
            { faturaId, requestID: result.requestID, pollError },
            'Registo aceite; validação assíncrona pendente (obterEstado)'
          );
        }
      }

      await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          statusEnvio,
          agtRequestID: result.requestID || null,
        },
      });

      if (hasErrors) {
        logger.warn({ faturaId, errors: result.errorList }, 'Reporte concluído com erros parciais da AGT');
      } else {
        logger.info({ faturaId, requestID: result.requestID, statusEnvio }, 'Reporte concluído com sucesso');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error({ faturaId, error: errorMessage }, 'Falha crítica no reporte à AGT');

      await prisma.fatura.update({
        where: { id: faturaId },
        data: { statusEnvio: 'ERRO' },
      });

      throw error;
    }
  },
  {
    connection: redis,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

reportAgtWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job de reporte AGT falhou definitivamente ou aguarda retry');
});
