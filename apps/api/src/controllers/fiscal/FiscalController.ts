import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { agtApiClient } from '../../services/fiscal/AgtApiClient';
import { certificationService } from '../../services/fiscal/CertificationService';
import { logger } from '../../lib/logger';
import * as crypto from 'crypto';

export const fiscalController = {
  /**
   * Testa a conexão com a API da AGT usando o token da clínica
   */
  async testarConexao(req: Request, res: Response) {
    const { id: clinicaId } = req.clinica;

    try {
      const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { agtApiToken: true, nif: true }
      });

      if (!clinica?.agtApiToken && process.env.AGT_MOCK !== 'true') {
        return res.status(400).json({ 
          sucesso: false, 
          mensagem: 'Token da API AGT não configurado' 
        });
      }

      // Chama obterEstado com um ID fictício para validar o token/conexão
      const softwareInfoDetail = {
        productId: 'ClinicaPlus SaaS',
        productVersion: '1.0.0',
        softwareValidationNumber: process.env.AGT_SOFTWARE_CERTIFICATE || '0'
      };

      const taxRegistrationNumber = clinica?.nif || '999999999';
      const requestID = 'PING-CHECK';

      const statusRequest = {
        schemaVersion: '1.0',
        submissionUUID: crypto.randomUUID(),
        taxRegistrationNumber,
        submissionTimeStamp: new Date().toISOString(),
        requestID,
        softwareInfo: {
          softwareInfoDetail,
          jwsSoftwareSignature: certificationService.signJWS(softwareInfoDetail)
        },
        jwsSignature: certificationService.signJWS({ taxRegistrationNumber, requestID })
      };

      const result = await agtApiClient.obterEstado(statusRequest as any, clinica?.agtApiToken || '');

      return res.json({ 
        sucesso: true, 
        mensagem: 'Conexão com a AGT estabelecida com sucesso',
        ambiente: process.env.NODE_ENV === 'production' && process.env.AGT_SANDBOX !== 'true' ? 'PRODUÇÃO' : 'SANDBOX'
      });
    } catch (error: any) {
      logger.error({ error, clinicaId }, 'Falha ao testar conexão com AGT');
      return res.status(500).json({ 
        sucesso: false, 
        mensagem: error.message || 'Erro ao conectar com a AGT'
      });
    }
  },

  /**
   * Audita a integridade da cadeia de hashes (Hash Chain)
   */
  async auditHashChain(req: Request, res: Response) {
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

      let totalDocumentos = faturas.length;
      let falhas = [];
      let hashAnterior = '';

      for (const f of faturas) {
        const payload = {
          dataEmissao: f.dataEmissao!,
          dataDocumento: f.criadoEm,
          numero: f.numeroFatura!,
          total: f.total,
          hashAnterior: hashAnterior,
          signatureBase64: f.fiscalHash || ''
        };

        const valido = certificationService.verificarAssinatura(payload);
        
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

    } catch (error: any) {
      logger.error({ error, clinicaId }, 'Erro na auditoria de hash chain');
      return res.status(500).json({ error: 'Falha ao processar auditoria' });
    }
  }
};
