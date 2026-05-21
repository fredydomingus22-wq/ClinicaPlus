import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

import { agtApiClient } from '../../services/fiscal/AgtApiClient';
import { CertificationService } from '../../services/fiscal/CertificationService';
import { logger } from '../../lib/logger';
import * as crypto from 'crypto';
import type { AgtStatusRequest } from '@clinicaplus/utils';

function getAgtAuthToken(): string {
  if (process.env.AGT_USERNAME && process.env.AGT_PASSWORD) {
    return `${process.env.AGT_USERNAME}:${process.env.AGT_PASSWORD}`;
  }
  return '';
}

function isTimeoutError(error: unknown): boolean {
  return !!(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ECONNABORTED');
}

function isUpstreamNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const code = (error as { code?: string }).code;
  return ['ECONNABORTED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPROTO'].includes(code || '');
}

export const fiscalController = {
  /**
   * Testa a conexão com a API da AGT usando o token da clínica
   */
  async testarConexao(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          agtApiToken: true, 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ 
          success: false, 
          message: 'Clínica não encontrada' 
        });
      }

      const agtApiToken = getAgtAuthToken();
      logger.debug({ hasToken: !!agtApiToken, source: process.env.AGT_API_TOKEN ? 'env' : 'db' }, 'AGT token used for connection test');
      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ 
          success: false, 
          message: 'Credenciais da API AGT não configuradas no servidor' 
        });
      }

      // Chama obterEstado com um ID fictício para validar o token/conexão
      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '999999999';
      const requestID = 'PING-CHECK';

      // Instanciar serviço com as chaves do tenant
      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const statusRequest = {
        schemaVersion: '1.0',
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

      await agtApiClient.obterEstado(statusRequest as AgtStatusRequest, agtApiToken);

      return res.json({ 
        success: true, 
        message: 'Conexão com a AGT estabelecida com sucesso',
        ambiente: process.env.NODE_ENV === 'production' && process.env.AGT_SANDBOX !== 'true' ? 'PRODUÇÃO' : 'SANDBOX'
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar com a AGT';
      logger.error({ error, clinicaId }, 'Falha ao testar conexão com AGT');
      return res.status(500).json({ 
        success: false, 
        message: message
      });
    }
  },

  /**
   * Consulta o estado assíncrono de uma submissão AGT por requestID e sincroniza status local.
   */
  async consultarEstadoSubmissaoAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { requestID } = req.body as { requestID?: string };

    if (!requestID || typeof requestID !== 'string') {
      return res.status(400).json({ error: 'requestID é obrigatório' });
    }

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: {
          agtApiToken: true,
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const agtApiToken = getAgtAuthToken();
      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT não configuradas no servidor' });
      }

      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '';
      const payload = {
        schemaVersion: '1.2',
        submissionUUID: crypto.randomUUID(),
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        requestID,
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, requestID })
      };

      const statusResult = await agtApiClient.obterEstado(payload as AgtStatusRequest, agtApiToken);

      const resultCode = String(statusResult.resultCode);

      // Atualização local por requestID e documentStatusList (modelo assíncrono AGT)
      if (resultCode === '0') {
        await prisma.fatura.updateMany({
          where: { clinicaId, agtRequestID: requestID },
          data: { statusEnvio: 'ENTREGUE' }
        });
      } else if (resultCode === '2' || resultCode === '9') {
        await prisma.fatura.updateMany({
          where: { clinicaId, agtRequestID: requestID },
          data: { statusEnvio: 'ERRO' }
        });
      } else if (resultCode === '1' && statusResult.documentStatusList?.length) {
        for (const doc of statusResult.documentStatusList) {
          const novoStatus = doc.documentStatus === 'V' ? 'ENTREGUE' : 'ERRO';
          await prisma.fatura.updateMany({
            where: { clinicaId, numeroFatura: doc.documentNo, agtRequestID: requestID },
            data: { statusEnvio: novoStatus }
          });
        }
      } else if (resultCode === '8') {
        await prisma.fatura.updateMany({
          where: { clinicaId, agtRequestID: requestID, statusEnvio: { in: ['PENDENTE', 'ENVIADO'] } },
          data: { statusEnvio: 'ENVIADO' }
        });
      }

      return res.json(statusResult);
    } catch (error: unknown) {
      if (isTimeoutError(error)) {
        logger.error({ error, clinicaId, requestID }, 'Timeout ao consultar estado da submissão na AGT');
        return res.status(504).json({ error: 'Timeout ao comunicar com a AGT. Tente novamente em instantes.' });
      }
      logger.error({ error, clinicaId, requestID }, 'Erro ao consultar estado da submissão na AGT');
      return res.status(500).json({ error: 'Falha ao consultar estado da submissão' });
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

      // Obter chaves da clínica para auditoria
      const clinicaData = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { agtPublicKey: true }
      });
      if (!clinicaData) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const certService = new CertificationService({
        tenantPublicKey: clinicaData.agtPublicKey || undefined
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
            motivo: 'Hash inválido ou quebra na cadeia'
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
   * Lista séries de facturação registadas na AGT
   */
  async listarSeriesAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          agtApiToken: true, 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const agtApiToken = getAgtAuthToken();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT não configuradas no servidor' });
      }

      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '';
      const requestID = crypto.randomUUID();

      const request = {
        schemaVersion: '1.0',
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        establishmentNumber: 'SEDE',
        seriesYear: new Date().getFullYear().toString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, requestID })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.listarSeries(request as any, agtApiToken);

      return res.json(response);
    } catch (error: unknown) {
      logger.error({ error, clinicaId }, 'Erro ao listar séries na AGT');
      return res.status(500).json({ error: 'Falha ao comunicar com a AGT' });
    }
  },

  /**
   * Solicita uma nova série à AGT
   */
  async solicitarSerieAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { serieCode, authorizedQuantity, documentType, establishmentNumber = 'SEDE' } = req.body;

    // Validate documentType against allowed AGT values
    const allowedDocumentTypes = ['FA','FT','FR','FG','GF','AC','AR','TV','RC','RG','RE','ND','NC','AF','RP','RA','CS','LD'] as const;
    if (!allowedDocumentTypes.includes(documentType as any)) {
      return res.status(400).json({ error: 'documentType inválido' });
    }
    logger.info({ clinicaId, serieCode, authorizedQuantity, documentType }, 'Solicitando nova série à AGT');

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          agtApiToken: true, 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const agtApiToken = getAgtAuthToken();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT não configuradas no servidor' });
      }

      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '';
      const submissionUUID = crypto.randomUUID();

      const request = {
        schemaVersion: '1.2',
        submissionUUID,
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        establishmentNumber,
        seriesYear: new Date().getFullYear().toString(),
        documentType: (documentType as string) || 'FT',
        seriesContingencyIndicator: 'N',
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({
          taxRegistrationNumber,
          establishmentNumber,
          seriesYear: new Date().getFullYear().toString(),
          documentType: (documentType as string) || 'FT'
        })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
logger.debug({ request }, 'Payload enviado à AGT para solicitar série');
      const response = await agtApiClient.solicitarSerie(request as any, agtApiToken);

      logger.info({ clinicaId, submissionUUID, resultCode: response.resultCode }, 'Série solicitada à AGT com sucesso');
      return res.json(response);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && (error as any).response) {
        const errResp = (error as any).response;
        logger.error({ errResp }, 'Erro da AGT ao solicitar série');
        return res.status(errResp.status).json(errResp.data);
      }
      if (isUpstreamNetworkError(error)) {
        logger.error({ error, clinicaId }, 'Falha de rede/TLS ao solicitar série na AGT');
        return res.status(504).json({ error: 'Falha de comunicação com a AGT (rede/TLS). Tente novamente em instantes.' });
      }
      logger.error({ error, clinicaId }, 'Erro ao solicitar série na AGT');
      return res.status(500).json({ error: 'Falha ao solicitar série' });
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
          agtApiToken: true, 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const agtApiToken = getAgtAuthToken();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT não configuradas no servidor' });
      }

      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '';
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
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, submissionGUID })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.listarFacturas(request as any, agtApiToken);

      return res.json(response);
    } catch (error: unknown) {
      if (isTimeoutError(error)) {
        logger.error({ error, clinicaId }, 'Timeout ao listar facturas na AGT');
        return res.status(504).json({ error: 'Timeout ao comunicar com a AGT. Tente novamente em instantes.' });
      }
      logger.error({ error, clinicaId }, 'Erro ao listar facturas na AGT');
      return res.status(500).json({ error: 'Falha ao consultar histórico na AGT' });
    }
  },

  /**
   * Consulta detalhes de uma facturas específica na AGT
   */
  async consultarFacturaAgt(req: Request, res: Response): Promise<Response> {
    const { id: clinicaId } = req.clinica;
    const { numero } = req.params;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          agtApiToken: true, 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const agtApiToken = getAgtAuthToken();

      if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ error: 'Credenciais AGT não configuradas no servidor' });
      }

      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '';
      const submissionUUID = crypto.randomUUID();

      const request = {
        schemaVersion: '1.0',
        submissionUUID,
        taxRegistrationNumber,
        invoiceNo: numero!,
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, invoiceNo: numero! })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.consultarFactura(request as any, agtApiToken);

      return res.json(response);
    } catch (error: unknown) {
      logger.error({ error, clinicaId, numero }, 'Erro ao consultar factura na AGT');
      return res.status(500).json({ error: 'Fatura não encontrada ou erro na AGT' });
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
        return res.status(404).json({ error: 'Documento não encontrado ou ainda não emitido' });
      }

      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { 
          agtApiToken: true, 
          nif: true,
          agtPrivateKey: true,
          agtPublicKey: true
        }
      });

      if (!clinica) {
        return res.status(404).json({ error: 'Clínica não encontrada' });
      }

      const certService = new CertificationService({
        tenantPrivateKey: clinica.agtPrivateKey || undefined,
        tenantPublicKey: clinica.agtPublicKey || undefined
      });

      const softwareInfoDetail = {
        productId: 'DocAgen',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0',
        signatureVersion: Number(process.env.AGT_SIGNATURE_VERSION || 1)
      };

      const taxRegistrationNumber = clinica.nif || '';
      const requestID = crypto.randomUUID();

      const request = {
        schemaVersion: '1.0',
        taxRegistrationNumber,
        documentNo: fatura.numeroFatura,
        action: 'C', // Confirmação
        submissionTimeStamp: new Date().toISOString(),
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
        },
        jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, requestID })
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await agtApiClient.validarDocumento(request as any, getAgtAuthToken());
      return res.json(response);
    } catch (error: unknown) {
      logger.error({ error, clinicaId, faturaId }, 'Erro ao validar documento na AGT');
      return res.status(500).json({ error: 'Erro ao validar documento' });
    }
  }
};
