import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis';
import { logger as baseLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { agtApiClient, CertificationService } from '@clinicaplus/utils/server';
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
 * Implementa a nova especificação de Faturação Electrónica (Specs 2026)
 */
export const reportAgtWorker = new Worker<ReportAgtJob>(
  JobNames.REPORT_AGT,
  async (job: Job<ReportAgtJob>) => {
    const { faturaId, clinicaId } = job.data;
    
    logger.info({ faturaId, clinicaId, attempt: job.attemptsMade + 1 }, 'Iniciando reporte de Fatura Electrónica');

    try {
      // 1. Buscar fatura e dados da clínica
      const fatura = await prisma.fatura.findUnique({
        where: { id: faturaId, clinicaId },
        include: { 
          itens: true,
          snapshot: true,
          clinica: true
        }
      });

      if (!fatura || !fatura.snapshot) {
        logger.error({ faturaId }, 'Fatura ou Snapshot não encontrado para reporte');
        return;
      }

      const apiToken = getAgtAuthToken();
      if (!apiToken && process.env.AGT_MOCK !== 'true') {
        throw new AppError('Token da API AGT não configurado', 400);
      }

      // 2. Preparar Software Info (Global SaaS)
      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      // A AGT diz: "Todos os campos do objecto softwareInfo devem ser usados na assinatura."
      // Assinamos o softwareInfoDetail que contém todos os campos informativos.
      const certService = new CertificationService({
        tenantPrivateKey: fatura.clinica.agtPrivateKey || undefined,
        tenantPublicKey: fatura.clinica.agtPublicKey || undefined
      });
      const jwsSoftwareSignature = certService.signSoftwareJWS(softwareInfoDetail);

      // 3. Preparar Documento
      const documentDateFormatted = fatura.dataEmissao!.toISOString().split('T')[0];
      const entryDateFormatted = fatura.dataEmissao!.toISOString().substring(0, 19); // YYYY-MM-DDTHH:mm:ss

      const documentTotals = {
        taxPayable: (fatura.totalIva / 100).toFixed(2),
        netTotal: (fatura.subtotal / 100).toFixed(2),
        grossTotal: (fatura.total / 100).toFixed(2)
      };

      const docLines = fatura.itens.map((item, idx) => {
        const unitPrice = item.precoUnit / 100;
        const unitPriceBase = (item.total / item.quantidade) / 100;
        const netLineTotal = item.total / 100; // creditAmount (total sem imposto)
        
        // Regra AGT: Arredondar por excesso (Math.ceil) para o cêntimo seguinte
        // Usamos multiplicação inteira antes da divisão para evitar imprecisões de floating point
        const rawTaxAmount = (item.total * item.taxaIva) / 100;
        const taxContribution = (Math.ceil(rawTaxAmount) / 100).toFixed(2);

        return {
          lineNumber: (idx + 1).toString(),
          operationType: 'SS',
          productCode: item.id.substring(0, 8).toUpperCase(),
          productDescription: item.descricao,
          quantity: item.quantidade.toString(),
          unitOfMeasure: 'un',
          unitPrice: unitPrice.toFixed(2),
          unitPriceBase: unitPriceBase.toFixed(2),
          creditAmount: netLineTotal.toFixed(2),
          taxes: [
            {
              taxType: 'IVA',
              taxCountryRegion: 'AO',
              taxCode: item.codigoIva || 'ISE',
              taxPercentage: item.taxaIva.toFixed(2),
              taxBase: netLineTotal.toFixed(2),
              taxContribution: taxContribution
            }
          ]
        };
      });

      // Campos específicos para assinatura JWS do documento conforme DS.120
      const signingPayload = {
        documentNo: fatura.numeroFatura!,
        taxRegistrationNumber: fatura.clinica.nif || '999999999',
        documentType: fatura.tipoDocFiscal,
        documentDate: documentDateFormatted,
        customerTaxID: fatura.snapshot.clienteNif,
        customerCountry: 'AO',
        companyName: fatura.snapshot.clienteNome,
        documentTotals
      };

      const jwsDocumentSignature = certService.signDocumentJWS(signingPayload);

      const docBody = {
        documentNo: fatura.numeroFatura!,
        documentStatus: 'N',
        documentDate: documentDateFormatted,
        documentType: fatura.tipoDocFiscal,
        eacCode: '86201',
        systemEntryDate: entryDateFormatted,
        customerTaxID: fatura.snapshot.clienteNif,
        customerCountry: 'AO',
        companyName: fatura.snapshot.clienteNome,
        lines: docLines,
        documentTotals,
        jwsDocumentSignature
      };

      // 4. Montar Request Final
      const requestPayload = {
        schemaVersion: '1.2',
        submissionUUID: crypto.randomUUID(),
        taxRegistrationNumber: fatura.clinica.nif || '999999999',
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature
        },
        numberOfEntries: 1,
        documents: [docBody]
      };


      // 5. Chamar API AGT
      const result = await agtApiClient.registarFactura(requestPayload as any, apiToken || '');

      // 6. Atualizar Estado da Fatura
      const hasErrors = result.errorList && result.errorList.length > 0;
      
      await prisma.fatura.update({
        where: { id: faturaId },
        data: {
          statusEnvio: hasErrors ? 'ERRO' : 'ENVIADO',
          agtRequestID: result.requestID || null,
        }
      });

      if (hasErrors) {
        logger.warn({ faturaId, errors: result.errorList }, 'Reporte concluído com erros parciais da AGT');
      } else {
        logger.info({ faturaId, requestID: result.requestID }, 'Reporte concluído com sucesso');
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      logger.error({ faturaId, error: errorMessage }, 'Falha crítica no reporte à AGT');

      await prisma.fatura.update({
        where: { id: faturaId },
        data: { statusEnvio: 'ERRO' }
      });

      throw error;
    }
  },
  { 
    connection: redis,
    limiter: {
      max: 10, // Máximo de 10 submissões simultâneas
      duration: 1000
    }
  }
);

// Eventos do Worker
reportAgtWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job de reporte AGT falhou definitivamente ou aguarda retry');
});
