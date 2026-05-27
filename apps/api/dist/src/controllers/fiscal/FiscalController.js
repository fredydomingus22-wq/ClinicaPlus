"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fiscalController = void 0;
const prisma_1 = require("../../lib/prisma");
const AgtApiClient_1 = require("../../services/fiscal/AgtApiClient");
const CertificationService_1 = require("../../services/fiscal/CertificationService");
const logger_1 = require("../../lib/logger");
const crypto = __importStar(require("crypto"));
const server_1 = require("@clinicaplus/utils/server");
const secretCrypto_1 = require("../../lib/secretCrypto");
function isTimeoutError(error) {
    return !!(error && typeof error === 'object' && 'code' in error && error.code === 'ECONNABORTED');
}
function isUpstreamNetworkError(error) {
    if (!error || typeof error !== 'object' || !('code' in error))
        return false;
    const code = error.code;
    return ['ECONNABORTED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPROTO'].includes(code || '');
}
function createAgtCertificationService(clinica) {
    const tenantKeys = (0, server_1.resolveAgtTenantKeys)(clinica, secretCrypto_1.decryptSecret);
    return new CertificationService_1.CertificationService(tenantKeys);
}
function mapAgtErrorToHttp(error) {
    if (!error || typeof error !== 'object')
        return null;
    const candidate = error;
    if (!candidate.code)
        return null;
    const status = typeof candidate.code === 'number' ? candidate.code : Number(candidate.code);
    if (!Number.isFinite(status) || status < 400 || status > 599)
        return null;
    return {
        status,
        payload: {
            error: candidate.message || 'Erro de comunicaÃ§Ã£o com a AGT',
            code: candidate.agtCode || candidate.code
        }
    };
}
exports.fiscalController = {
    /**
     * Testa a conexÃ£o com a API da AGT usando o token da clÃ­nica
     */
    async testarConexao(req, res) {
        const { id: clinicaId } = req.clinica;
        try {
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            logger_1.logger.debug({ hasToken: !!agtApiToken, source: 'env' }, 'AGT token used for connection test');
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({
                    success: false,
                    message: 'Credenciais da API AGT nÃ£o configuradas no servidor'
                });
            }
            // Chama obterEstado com um ID fictÃ­cio para validar o token/conexÃ£o
            const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
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
            await AgtApiClient_1.agtApiClient.obterEstado(statusRequest, agtApiToken || '');
            return res.json({
                success: true,
                sucesso: true,
                message: 'ConexÃ£o com a AGT estabelecida com sucesso',
                mensagem: 'ConexÃ£o com a AGT estabelecida com sucesso',
                ambiente: (0, server_1.formatAgtEnvLabel)((0, server_1.resolveAgtEnvFromProcessEnv)())
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao conectar com a AGT';
            logger_1.logger.error({ error, clinicaId }, 'Falha ao testar conexÃ£o com AGT');
            return res.status(500).json({
                success: false,
                message: message
            });
        }
    },
    /**
     * Consulta o estado assÃ­ncrono de uma submissÃ£o AGT por requestID e sincroniza status local.
     */
    async consultarEstadoSubmissaoAgt(req, res) {
        const { id: clinicaId } = req.clinica;
        const { requestID } = req.body;
        if (!requestID || typeof requestID !== 'string') {
            return res.status(400).json({ error: 'requestID Ã© obrigatÃ³rio' });
        }
        try {
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
            }
            const certService = createAgtCertificationService(clinica);
            if (!clinica.nif) {
                return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
            }
            const taxRegistrationNumber = clinica.nif;
            const payload = (0, server_1.buildAgtObterEstadoPayload)(taxRegistrationNumber, requestID, certService, {
                submissionUUID: crypto.randomUUID(),
            });
            const statusResult = await AgtApiClient_1.agtApiClient.obterEstado(payload, agtApiToken || '');
            const statusEnvio = (0, server_1.mapAgtStatusToEnvio)(statusResult);
            if (statusEnvio === 'ENTREGUE' || statusEnvio === 'ERRO') {
                await prisma_1.prisma.fatura.updateMany({
                    where: { clinicaId, agtRequestID: requestID },
                    data: { statusEnvio },
                });
            }
            else if (String(statusResult.resultCode) === '1' && statusResult.documentStatusList?.length) {
                for (const doc of statusResult.documentStatusList) {
                    const novoStatus = doc.documentStatus === 'V' ? 'ENTREGUE' : 'ERRO';
                    await prisma_1.prisma.fatura.updateMany({
                        where: { clinicaId, numeroFatura: doc.documentNo, agtRequestID: requestID },
                        data: { statusEnvio: novoStatus },
                    });
                }
            }
            else if (String(statusResult.resultCode) === '8') {
                await prisma_1.prisma.fatura.updateMany({
                    where: { clinicaId, agtRequestID: requestID, statusEnvio: { in: ['PENDENTE', 'ENVIADO'] } },
                    data: { statusEnvio: 'ENVIADO' },
                });
            }
            return res.json(statusResult);
        }
        catch (error) {
            if (isTimeoutError(error)) {
                logger_1.logger.error({ error, clinicaId, requestID }, 'Timeout ao consultar estado da submissÃ£o na AGT');
                return res.status(504).json({ error: 'Timeout ao comunicar com a AGT. Tente novamente em instantes.' });
            }
            logger_1.logger.error({ error, clinicaId, requestID }, 'Erro ao consultar estado da submissÃ£o na AGT');
            return res.status(500).json({ error: 'Falha ao consultar estado da submissÃ£o' });
        }
    },
    /**
     * Audita a integridade da cadeia de hashes (Hash Chain)
     */
    async auditHashChain(req, res) {
        const { id: clinicaId } = req.clinica;
        try {
            const faturas = await prisma_1.prisma.fatura.findMany({
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
            const clinicaData = await prisma_1.prisma.clinica.findUnique({
                where: { id: clinicaId },
                select: { agtPublicKey: true }
            });
            if (!clinicaData) {
                return res.status(404).json({ error: 'ClÃ­nica nÃ£o encontrada' });
            }
            const certService = new CertificationService_1.CertificationService({
                tenantPublicKey: clinicaData.agtPublicKey ? (0, secretCrypto_1.decryptSecret)(clinicaData.agtPublicKey) : undefined
            });
            for (const f of faturas) {
                const payload = {
                    dataEmissao: f.dataEmissao,
                    dataDocumento: f.criadoEm,
                    numero: f.numeroFatura,
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
        }
        catch (error) {
            logger_1.logger.error({ error, clinicaId }, 'Erro na auditoria de hash chain');
            return res.status(500).json({ error: 'Falha ao processar auditoria' });
        }
    },
    /**
     * Lista sÃ©ries de facturaÃ§Ã£o registadas na AGT
     */
    async listarSeriesAgt(req, res) {
        const { id: clinicaId } = req.clinica;
        try {
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
            }
            const certService = createAgtCertificationService(clinica);
            const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
            if (!clinica.nif) {
                return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
            }
            const taxRegistrationNumber = clinica.nif;
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
                jwsSignature: certService.signRequestJWS({ taxRegistrationNumber })
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await AgtApiClient_1.agtApiClient.listarSeries(request, agtApiToken || '');
            // Log para debug da resposta da AGT
            logger_1.logger.info({ response, documentStatusList: response.documentStatusList, resultCode: response.resultCode }, 'Resposta da AGT ao listar séries');
            // Mapear resposta da AGT para formato esperado pelo frontend
            // A AGT retorna documentStatusList com status de documentos, não seriesInfo
            const items = (response.documentStatusList || []).map((doc) => ({
                id: doc.documentNo || doc.requestID,
                serieCode: doc.documentNo?.split('-')[0] || 'N/A',
                documentType: doc.documentNo?.split('-')[1] || 'FT',
                authorizedQuantity: 0, // AGT não fornece este campo em listarSeries
                availableQuantity: 0, // AGT não fornece este campo em listarSeries
                status: doc.documentStatus === 'A' ? 'ACTIVE' : 'EXPIRED'
            }));
            logger_1.logger.info({ itemsCount: items.length, items }, 'Items mapeados para o frontend');
            return res.json({ ...response, items });
        }
        catch (error) {
            logger_1.logger.error({ error, clinicaId }, 'Erro ao listar sÃ©ries na AGT');
            return res.status(500).json({ error: 'Falha ao comunicar com a AGT' });
        }
    },
    /**
     * Solicita uma nova serie a AGT
     */
    async solicitarSerieAgt(req, res) {
        const { id: clinicaId } = req.clinica;
        const { serieCode, authorizedQuantity, documentType, establishmentNumber = 'SEDE' } = req.body;
        // Validate documentType against allowed AGT values
        const allowedDocumentTypes = ['FA', 'FT', 'FR', 'FG', 'GF', 'AC', 'AR', 'TV', 'RC', 'RG', 'RE', 'ND', 'NC', 'AF', 'RP', 'RA', 'CS', 'LD'];
        if (!allowedDocumentTypes.includes(documentType)) {
            return res.status(400).json({ error: 'documentType invÃ¡lido' });
        }
        logger_1.logger.info({ clinicaId, serieCode, authorizedQuantity, documentType }, 'Solicitando nova sÃ©rie Ã  AGT');
        try {
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
            }
            const certService = createAgtCertificationService(clinica);
            const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
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
                documentType: documentType || 'FT',
                seriesContingencyIndicator,
                softwareInfo: {
                    softwareInfoDetail,
                    jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
                },
                jwsSignature: certService.signRequestJWS({
                    taxRegistrationNumber,
                    seriesYear,
                    documentType: documentType || 'FT',
                    establishmentNumber,
                    seriesContingencyIndicator
                })
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logger_1.logger.debug({
                submissionUUID,
                taxRegistrationNumber,
                establishmentNumber,
                documentType: request.documentType,
                hasSoftwareSignature: !!request.softwareInfo.jwsSoftwareSignature,
                hasRequestSignature: !!request.jwsSignature,
            }, 'Payload AGT para solicitar sÃ©rie preparado');
            const response = await AgtApiClient_1.agtApiClient.solicitarSerie(request, agtApiToken || '');
            logger_1.logger.info({ clinicaId, submissionUUID, resultCode: response.resultCode }, 'SÃ©rie solicitada Ã  AGT com sucesso');
            return res.json(response);
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error && error.response) {
                const errResp = error.response;
                logger_1.logger.error({ errResp }, 'Erro da AGT ao solicitar sÃ©rie');
                return res.status(errResp.status).json(errResp.data);
            }
            if (isUpstreamNetworkError(error)) {
                logger_1.logger.error({ error, clinicaId }, 'Falha de rede/TLS ao solicitar sÃ©rie na AGT');
                return res.status(504).json({ error: 'Falha de comunicaÃ§Ã£o com a AGT (rede/TLS). Tente novamente em instantes.' });
            }
            logger_1.logger.error({ error, clinicaId }, 'Erro ao solicitar sÃ©rie na AGT');
            return res.status(500).json({ error: 'Falha ao solicitar sÃ©rie' });
        }
    },
    /**
     * Lista facturas directamente do servidor da AGT
     */
    async listarFacturasAgt(req, res) {
        const { id: clinicaId } = req.clinica;
        const { startDate, endDate } = req.body;
        try {
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
            }
            const certService = createAgtCertificationService(clinica);
            const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
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
            const response = await AgtApiClient_1.agtApiClient.listarFacturas(request, agtApiToken || '');
            return res.json(response);
        }
        catch (error) {
            const mappedError = mapAgtErrorToHttp(error);
            if (mappedError) {
                logger_1.logger.warn({ error, clinicaId, startDate, endDate }, 'Erro retornado pela AGT ao listar facturas');
                return res.status(mappedError.status).json(mappedError.payload);
            }
            if (isTimeoutError(error)) {
                logger_1.logger.error({ error, clinicaId }, 'Timeout ao listar facturas na AGT');
                return res.status(504).json({ error: 'Timeout ao comunicar com a AGT. Tente novamente em instantes.' });
            }
            logger_1.logger.error({ error, clinicaId }, 'Erro ao listar facturas na AGT');
            return res.status(500).json({ error: 'Falha ao consultar histÃ³rico na AGT' });
        }
    },
    /**
     * Consulta detalhes de uma facturas especÃ­fica na AGT
     */
    async consultarFacturaAgt(req, res) {
        const { id: clinicaId } = req.clinica;
        const numero = req.params.numero
            ?? req.body?.documentNo
            ?? req.body?.invoiceNo;
        if (!numero) {
            return res.status(400).json({ error: 'documentNo Ã© obrigatÃ³rio' });
        }
        try {
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
            }
            const certService = createAgtCertificationService(clinica);
            const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
            if (!clinica.nif) {
                return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
            }
            const taxRegistrationNumber = clinica.nif;
            const submissionUUID = crypto.randomUUID();
            const request = {
                schemaVersion: '1.2',
                submissionUUID,
                taxRegistrationNumber,
                invoiceNo: numero,
                submissionTimeStamp: new Date().toISOString(),
                softwareInfo: {
                    softwareInfoDetail,
                    jwsSoftwareSignature: certService.signSoftwareJWS(softwareInfoDetail)
                },
                jwsSignature: certService.signRequestJWS({ taxRegistrationNumber, documentNo: numero })
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await AgtApiClient_1.agtApiClient.consultarFactura(request, agtApiToken || '');
            return res.json(response);
        }
        catch (error) {
            const mappedError = mapAgtErrorToHttp(error);
            if (mappedError) {
                logger_1.logger.warn({ error, clinicaId, numero }, 'Erro retornado pela AGT ao consultar factura');
                return res.status(mappedError.status).json(mappedError.payload);
            }
            if (isTimeoutError(error) || isUpstreamNetworkError(error)) {
                logger_1.logger.error({ error, clinicaId, numero }, 'Falha de comunicaÃ§Ã£o com AGT ao consultar factura');
                return res.status(504).json({
                    error: 'Falha de comunicaÃ§Ã£o com a AGT (rede/TLS/reset). Tente novamente em instantes.'
                });
            }
            logger_1.logger.error({ error, clinicaId, numero }, 'Erro ao consultar factura na AGT');
            return res.status(500).json({ error: 'Fatura nÃ£o encontrada ou erro na AGT' });
        }
    },
    /**
     * Valida um documento local contra a base da AGT
     */
    async validarDocumentoAgt(req, res) {
        const { id: clinicaId } = req.clinica;
        const { faturaId } = req.params;
        try {
            const fatura = await prisma_1.prisma.fatura.findUnique({
                where: { id: faturaId },
            });
            if (!fatura || fatura.clinicaId !== clinicaId || !fatura.numeroFatura) {
                return res.status(404).json({ error: 'Documento nÃ£o encontrado ou ainda nÃ£o emitido' });
            }
            const clinica = await prisma_1.prisma.clinica.findUnique({
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
            const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
            const agtApiToken = (0, server_1.getAgtBasicAuthFromEnv)();
            if (!agtApiToken && process.env.AGT_MOCK !== 'true') {
                return res.status(400).json({ error: 'Credenciais AGT nÃ£o configuradas no servidor' });
            }
            if (!clinica.nif) {
                return res.status(400).json({ error: 'NIF da clÃ­nica nÃ£o configurado para integraÃ§Ã£o AGT' });
            }
            const taxRegistrationNumber = clinica.nif;
            const action = req.body?.action || 'C';
            const deductibleVATPercentage = req.body?.deductibleVATPercentage;
            const nonDeductibleAmount = req.body?.nonDeductibleAmount;
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
            const response = await AgtApiClient_1.agtApiClient.validarDocumento(request, agtApiToken || '');
            return res.json(response);
        }
        catch (error) {
            logger_1.logger.error({ error, clinicaId, faturaId }, 'Erro ao validar documento na AGT');
            return res.status(500).json({ error: 'Erro ao validar documento' });
        }
    }
};
