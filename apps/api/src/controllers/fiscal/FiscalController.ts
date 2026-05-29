import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

import { agtApiClient } from '../../services/fiscal/AgtApiClient';
import { CertificationService } from '../../services/fiscal/CertificationService';
import { logger } from '../../lib/logger';
import * as crypto from 'crypto';
import type { AgtStatusRequest, AgtError } from '@clinicaplus/utils';
import {
  buildAgtObterEstadoPayload,
  getDefaultAgtSoftwareInfoDetail,
  getAgtBasicAuthFromEnv,
  formatAgtEnvLabel,
  mapAgtStatusToEnvio,
  resolveAgtEnvFromProcessEnv,
  resolveAgtTenantKeys,
} from '@clinicaplus/utils/server';
import { decryptSecret } from '../../lib/secretCrypto';
import { buildAgtFailurePayload, isAgtBusinessFailure, mapAgtSeriesItems } from './agtResponse';

function isTimeoutError(error: unknown): boolean {
  return !!(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ECONNABORTED');
}

function isUpstreamNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const code = (error as { code?: string }).code;
  return ['ECONNABORTED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPROTO'].includes(code || '');
}

function createAgtCertificationService(clinica: { agtPrivateKey?: string | null; agtPublicKey?: string | null }) {
  const tenantKeys = resolveAgtTenantKeys(clinica, decryptSecret);
  return new CertificationService(tenantKeys);
}

function mapAgtErrorToHttp(error: unknown): { status: number; payload: { error: string; code?: string | number } } | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as Partial<AgtError> & { message?: string; code?: string | number; agtCode?: string };
  if (!candidate.code) return null;
  const status = typeof candidate.code === 'number' ? candidate.code : Number(candidate.code);
  if (!Number.isFinite(status) || status < 400 || status > 599) return null;
  return {
    status,
    payload: {
      error: candidate.message || 'Erro de comunicaÃ§Ã£o com a AGT',
      code: candidate.agtCode || candidate.code
    }
  };
}

export const fiscalController = {
  /**
   * Testa a conexÃ£o com a API da AGT usando o token da clÃ­nica
   */
  async testarConexao(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ 
          success: false, 
          message: 'ClÃ­nica nÃ£o encontrada' 
        });
      }

      const agtApiToken = getAgtBasicAuthFromEnv();
      logger.debug({ hasToken: !!agtApiToken, source: 'env' }, 'AGT token used for connection test');
      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: 'Credenciais da API AGT nÃ£o configuradas no servidor' 
        });
      }

      // Chama obterEstado com um ID fictÃ­cio para validar o token/conexÃ£o
      const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

      if (!clinica.nif) {
        return res.status(400).json({
          success: false,
          message: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT'
        });
      }

      const taxRegistrationNumber = clinica.nif;
      const requestID = 'PING-CHECK';

      // Instanciar serviÃ§o com as chaves do tenant
      const certService = createAgtCertificationService(clinica);

      const statusRequest = {
        schemaVersion: '1.2',
        submissionUUID: crypto.randomUUID(),
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        requestID,
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, requestID })
      };

      await agtApiClient.obterEstado(statusRequest as AgtStatusRequest, agtApiToken || '');

      return res.json({ 
        success: true, 
        sucesso: true,
        message: 'ConexÃ£o com a AGT estabelecida com sucesso',
        mensagem: 'ConexÃ£o com a AGT estabelecida com sucesso',
        ambiente: formatAgtEnvLabel(resolveAgtEnvFromProcessEnv())
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar com a AGT';
      logger.error({ error, clinicaId }, 'Falha ao testar conexÃ£o com AGT');
      return res.status(500).json({ 
        success: false, 
        message: message
      });
    }
  },

  /**
   * Consulta o estado assÃ­ncrono de uma submissÃ£o AGT por requestID e sincroniza status local.
   */
  async consultarEstadoSubmissaoAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { requestID } = req.body as { requestID?: string };

    if (!requestID || typeof requestID !== 'string') {
      return res.status(400).json({ error: 'requestID Ã© obrigatÃ³rio' });
    }

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: {
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const agtApiToken = getAgtBasicAuthFromEnv();
      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
      }

      const certService = createAgtCertificationService(clinica);

      if (!clinica.nif) {
        return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
      }

      const taxRegistrationNumber = clinica.nif;
      const payload = buildAgtObterEstadoPayload(taxRegistrationNumber, requestID, certService, {
        submissionUUID: crypto.randomUUID(),
      });

      const statusResult = await agtApiClient.obterEstado(payload as AgtStatusRequest, agtApiToken || '');
      const statusEnvio = mapAgtStatusToEnvio(statusResult);

      if (statusEnvio === 'ENTREGUE' || statusEnvio === 'ERRO') {
        await prisma.fatura.updateMany({
          where: { clinicaId, agtRequestID: requestID },
          data: { statusEnvio },
        });
      } else if (String(statusResult.resultCode) === '1' && statusResult.documentStatusList?.length) {
        for (const doc of statusResult.documentStatusList) {
          const novoStatus = doc.documentStatus === 'V' ? 'ENTREGUE' : 'ERRO';
          await prisma.fatura.updateMany({
            where: { clinicaId, numeroFatura: doc.documentNo, agtRequestID: requestID },
            data: { statusEnvio: novoStatus },
          });
        }
      } else if (String(statusResult.resultCode) === '8') {
        await prisma.fatura.updateMany({
          where: { clinicaId, agtRequestID: requestID, statusEnvio: { in: ['PENDENTE', 'ENVIADO'] } },
          data: { statusEnvio: 'ENVIADO' },
        });
      }

      return res.json(statusResult);
    } catch (error: unknown) {
      if (isTimeoutError(error)) {
        logger.error({ error, clinicaId, requestID }, 'Timeout ao consultar estado da submissÃ£o na AGT');
        return res.status(504).json({ error: 'Timeout ao comunicar com a AGT. Tente novamente em instantes.' });
      }
      logger.error({ error, clinicaId, requestID }, 'Erro ao consultar estado da submissÃ£o na AGT');
      return res.status(500).json({ error: 'Falha ao consultar estado da submissÃ£o' });
    }
  },

  /**
   * Audita a integridade da cadeia de hashes (Hash Chain)
   */
  async auditHashChain(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;

    try {
      const faturas = await prisma.fatura.findMany({
        where: { 
          clinicaId,
          estado: { not: 'RASCUNHO' }
        },
        orderBy: { numeroFatura: 'asc' },
        include: { paciente: true }
      });

      const totalDocumentos = faturas.length;
      const falhas = [];
      let hashAnterior = '';

      // Obter chaves da clÃ­nica para auditoria
      const clinicaData = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { agtPublicKey: true }
      });
      if (!clinicaData) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const certService = new CertificationService({
        tenantPublicKey: clinicaData.agtPublicKey ? decryptSecret(clinicaData.agtPublicKey) : undefined
      });

      for (const f of faturas) {
        const payload = {
          dataEmissao: f.dataEmissao!,
          dataDocumento: f.criadoEm,
          numero: f.numeroFatura!,
          total: f.total,
          hashAnterior: hashAnterior,
          signatureBase64: f.fiscalHash || ''
        };

        const valido = certService.verificarAssinatura(payload);
        
        if (!valido) {
          falhas.push({
            fatura: f.numeroFatura,
            id: f.id,
            motivo: 'Hash invÃ¡lido ou quebra na cadeia'
          });
        }

        hashAnterior = f.fiscalHash || '';
      }

      return res.json({
        valida: falhas.length === 0,
        totalDocumentos,
        falhas: falhas.slice(0, 10), // Limitar logs de erro
        ultimoHash: hashAnterior
      });

    } catch (error: unknown) {
      logger.error({ error, clinicaId }, 'Erro na auditoria de hash chain');
      return res.status(500).json({ error: 'Falha ao processar auditoria' });
    }
  },

  /**
   * Lista sÃ©ries de facturaÃ§Ã£o registadas na AGT
   */
  async listarSeriesAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const agtApiToken = getAgtBasicAuthFromEnv();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
      }

      const certService = createAgtCertificationService(clinica);
      const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

      if (!clinica.nif) {
        return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
      }

      const taxRegistrationNumber = clinica.nif;
      const request = {
        schemaVersion: '1.2',
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        establishmentNumber: 'SEDE',
        seriesYear: new Date().getFullYear().toString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.listarSeries(request as any, agtApiToken || '');

      // Log para debug da resposta da AGT
      logger.info(
        {
          response,
          documentStatusList: response.documentStatusList,
          seriesInfo: (response as any).seriesInfo,
          resultCode: response.resultCode
        },
        'Resposta da AGT ao listar séries'
      );

      if (isAgtBusinessFailure(response, ['1'])) {
        const payload = buildAgtFailurePayload(response, 'A AGT recusou o pedido de listagem de séries');
        logger.warn({ clinicaId, payload }, 'AGT devolveu erro ao listar séries');
        return res.status(422).json(payload);
      }

      // Mapear resposta da AGT para formato esperado pelo frontend
      const items = mapAgtSeriesItems(response as any);

      logger.info({ itemsCount: items.length, items }, 'Items mapeados para o frontend');

      return res.json({ ...response, items });
    } catch (error: unknown) {
      logger.error({ error, clinicaId }, 'Erro ao listar sÃ©ries na AGT');
      return res.status(500).json({ error: 'Falha ao comunicar com a AGT' });
    }
  },

  /**
   * Solicita uma nova serie a AGT
   */
  async solicitarSerieAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { serieCode, authorizedQuantity, documentType, establishmentNumber = 'SEDE' } = req.body;

    // Validate documentType against allowed AGT values
    const allowedDocumentTypes = ['FA','FT','FR','FG','GF','AC','AR','TV','RC','RG','RE','ND','NC','AF','RP','RA','CS','LD'] as const;
    if (!allowedDocumentTypes.includes(documentType as any)) {
      return res.status(400).json({ error: 'documentType invÃ¡lido' });
    }
    logger.info({ clinicaId, serieCode, authorizedQuantity, documentType }, 'Solicitando nova sÃ©rie Ã  AGT');

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const agtApiToken = getAgtBasicAuthFromEnv();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
      }

      const certService = createAgtCertificationService(clinica);
      const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

      if (!clinica.nif) {
        return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
      }

      const taxRegistrationNumber = clinica.nif;
      const submissionUUID = crypto.randomUUID();
      const seriesYear = new Date().getFullYear().toString();
      const seriesContingencyIndicator = 'N';

      const request = {
        schemaVersion: '1.2',
        submissionUUID,
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        establishmentNumber,
        seriesYear,
        documentType: (documentType as string) || 'FT',
        seriesContingencyIndicator,
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({
          taxRegistrationNumber,
          seriesYear,
          documentType: (documentType as string) || 'FT',
          establishmentNumber,
          seriesContingencyIndicator
        })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger.debug(
        {
          submissionUUID,
          taxRegistrationNumber,
          establishmentNumber,
          documentType: request.documentType,
          hasSoftwareSignature: !!request.softwareInfo.jwsSoftwareSignature,
          hasRequestSignature: !!request.jwsSignature,
        },
        'Payload AGT para solicitar sÃ©rie preparado'
      );
      const response = await agtApiClient.solicitarSerie(request as any, agtApiToken || '');

      if (isAgtBusinessFailure(response, [1, '1'])) {
        const payload = buildAgtFailurePayload(response, 'A AGT recusou o pedido de nova série');
        logger.warn({ clinicaId, submissionUUID, payload }, 'AGT devolveu erro ao solicitar série');
        return res.status(422).json(payload);
      }

      logger.info({ clinicaId, submissionUUID, resultCode: response.resultCode }, 'SÃ©rie solicitada Ã  AGT com sucesso');
      return res.json(response);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && (error as any).response) {
        const errResp = (error as any).response;
        logger.error({ errResp }, 'Erro da AGT ao solicitar sÃ©rie');
        return res.status(errResp.status).json(errResp.data);
      }
      if (isUpstreamNetworkError(error)) {
        logger.error({ error, clinicaId }, 'Falha de rede/TLS ao solicitar sÃ©rie na AGT');
        return res.status(504).json({ error: 'Falha de comunicaÃ§Ã£o com a AGT (rede/TLS). Tente novamente em instantes.' });
      }
      logger.error({ error, clinicaId }, 'Erro ao solicitar sÃ©rie na AGT');
      return res.status(500).json({ error: 'Falha ao solicitar sÃ©rie' });
    }
  },

  /**
   * Lista facturas directamente do servidor da AGT
   */
  async listarFacturasAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { startDate, endDate } = req.body;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const agtApiToken = getAgtBasicAuthFromEnv();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
      }

      const certService = createAgtCertificationService(clinica);
      const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

      if (!clinica.nif) {
        return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
      }

      const taxRegistrationNumber = clinica.nif;
      const submissionGUID = crypto.randomUUID();

      const request = {
        schemaVersion: '1.0',
        submissionGUID,
        taxRegistrationNumber,
        queryStartDate: startDate,
        queryEndDate: endDate,
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({
          taxRegistrationNumber,
          queryStartDate: startDate,
          queryEndDate: endDate
        })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.listarFacturas(request as any, agtApiToken || '');

      return res.json(response);
    } catch (error: unknown) {
      const mappedError = mapAgtErrorToHttp(error);
      if (mappedError) {
        logger.warn({ error, clinicaId, startDate, endDate }, 'Erro retornado pela AGT ao listar facturas');
        return res.status(mappedError.status).json(mappedError.payload);
      }
      if (isTimeoutError(error)) {
        logger.error({ error, clinicaId }, 'Timeout ao listar facturas na AGT');
        return res.status(504).json({ error: 'Timeout ao comunicar com a AGT. Tente novamente em instantes.' });
      }
      logger.error({ error, clinicaId }, 'Erro ao listar facturas na AGT');
      return res.status(500).json({ error: 'Falha ao consultar histÃ³rico na AGT' });
    }
  },

  /**
   * Consulta detalhes de uma facturas especÃ­fica na AGT
   */
  async consultarFacturaAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const numero = req.params.numero
      ?? (req.body as { documentNo?: string; invoiceNo?: string })?.documentNo
      ?? (req.body as { documentNo?: string; invoiceNo?: string })?.invoiceNo;

    if (!numero) {
      return res.status(400).json({ error: 'documentNo Ã© obrigatÃ³rio' });
    }

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const agtApiToken = getAgtBasicAuthFromEnv();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
      }

      const certService = createAgtCertificationService(clinica);
      const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

      if (!clinica.nif) {
        return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
      }

      const taxRegistrationNumber = clinica.nif;
      const submissionUUID = crypto.randomUUID();

      const request = {
        schemaVersion: '1.2',
        submissionUUID,
        taxRegistrationNumber,
        documentNo: numero,
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, documentNo: numero })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.consultarFactura(request as any, agtApiToken || '');

      return res.json(response);
    } catch (error: unknown) {
      const mappedError = mapAgtErrorToHttp(error);
      if (mappedError) {
        logger.warn({ error, clinicaId, numero }, 'Erro retornado pela AGT ao consultar factura');
        return res.status(mappedError.status).json(mappedError.payload);
      }
      if (isTimeoutError(error) || isUpstreamNetworkError(error)) {
        logger.error({ error, clinicaId, numero }, 'Falha de comunicaÃ§Ã£o com AGT ao consultar factura');
        return res.status(504).json({
          error: 'Falha de comunicaÃ§Ã£o com a AGT (rede/TLS/reset). Tente novamente em instantes.'
        });
      }
      logger.error({ error, clinicaId, numero }, 'Erro ao consultar factura na AGT');
      return res.status(500).json({ error: 'Fatura nÃ£o encontrada ou erro na AGT' });
    }
  },

  /**
   * Valida um documento local contra a base da AGT
   */
  async validarDocumentoAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { faturaId } = req.params;

    try {
      const fatura = await prisma.fatura.findUnique({
        where: { id: faturaId as string },
      });

      if (!fatura || fatura.clinicaId !== clinicaId || !fatura.numeroFatura) {
        return res.status(404).json({ error: 'Documento nÃ£o encontrado ou ainda nÃ£o emitido' });
      }

      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
      }

      const certService = createAgtCertificationService(clinica);
      const softwareInfoDetail = getDefaultAgtSoftwareInfoDetail();

      const agtApiToken = getAgtBasicAuthFromEnv();
      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
      }

      if (!clinica.nif) {
        return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
      }

      const taxRegistrationNumber = clinica.nif;
      const action = (req.body as { action?: string })?.action || 'C';
      const deductibleVATPercentage = (req.body as { deductibleVATPercentage?: string | number })?.deductibleVATPercentage;
      const nonDeductibleAmount = (req.body as { nonDeductibleAmount?: string | number })?.nonDeductibleAmount;

      const request = {
        schemaVersion: '1.2',
        taxRegistrationNumber,
        documentNo: fatura.numeroFatura,
        action,
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        ...(deductibleVATPercentage !== undefined ? { deductibleVATPercentage } : {}),
        ...(nonDeductibleAmount !== undefined ? { nonDeductibleAmount } : {}),
        jwsSignature: certService.signRequestJWS({
          taxRegistrationNumber,
          documentNo: fatura.numeroFatura,
          action,
          ...(deductibleVATPercentage !== undefined ? { deductibleVATPercentage } : {}),
          ...(nonDeductibleAmount !== undefined ? { nonDeductibleAmount } : {}),
        })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.validarDocumento(request as any, agtApiToken || '');
      return res.json(response);
    } catch (error: unknown) {
      logger.error({ error, clinicaId, faturaId }, 'Erro ao validar documento na AGT');
      return res.status(500).json({ error: 'Erro ao validar documento' });
    }
  }
};
