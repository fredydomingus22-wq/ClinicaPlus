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
exports.reportAgtWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const prisma_1 = require("../lib/prisma");
const server_1 = require("@clinicaplus/utils/server");
const utils_1 = require("@clinicaplus/utils");
const events_1 = require("@clinicaplus/events");
const crypto = __importStar(require("crypto"));
const secretCrypto_1 = require("../lib/secretCrypto");
const logger = logger_1.logger.child({ worker: 'report-agt' });
const env = (0, server_1.resolveAgtEnvFromProcessEnv)();
const agtApiClient = new server_1.AgtApiClient({
    env,
    logger,
    isMock: process.env.AGT_MOCK === 'true' || process.env.NODE_ENV === 'test',
});
/**
 * Worker para reporte de faturas à AGT (e-Factura)
 */
exports.reportAgtWorker = new bullmq_1.Worker(events_1.JobNames.REPORT_AGT, async (job) => {
    const { faturaId, clinicaId } = job.data;
    logger.info({ faturaId, clinicaId, attempt: job.attemptsMade + 1 }, 'Iniciando reporte de Fatura Electrónica');
    try {
        const fatura = await prisma_1.prisma.fatura.findUnique({
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
        const apiToken = (0, server_1.getAgtBasicAuthFromEnv)();
        if (!apiToken && process.env.AGT_MOCK !== 'true') {
            throw new utils_1.AppError('Token da API AGT não configurado', 400);
        }
        const tenantKeys = (0, server_1.resolveAgtTenantKeys)(fatura.clinica, secretCrypto_1.decryptSecret);
        const certService = new server_1.CertificationService(tenantKeys);
        if (!fatura.clinica.nif) {
            throw new utils_1.AppError('NIF da clínica não configurado para reporte AGT', 400);
        }
        const requestPayload = (0, server_1.buildAgtRegistarFacturaPayload)({
            numeroFatura: fatura.numeroFatura,
            tipoDocFiscal: fatura.tipoDocFiscal,
            dataEmissao: fatura.dataEmissao,
            systemEntryDate: fatura.criadoEm,
            subtotal: fatura.subtotal,
            totalIva: fatura.totalIva,
            total: fatura.total,
            retencaoFonte: fatura.retencaoFonte,
            taxRegistrationNumber: fatura.clinica.nif,
            emitenteNome: fatura.snapshot.emitenteNome,
            clienteNif: fatura.snapshot.clienteNif,
            clienteNome: fatura.snapshot.clienteNome,
            clienteCountry: fatura.snapshot.clienteCountry ||
                (0, server_1.resolveCustomerCountry)(fatura.snapshot.clienteNif),
            itens: fatura.itens.map((item) => ({
                id: item.id,
                descricao: item.descricao,
                quantidade: item.quantidade,
                precoUnit: item.precoUnit,
                desconto: item.desconto,
                taxaIva: item.taxaIva,
                codigoIva: item.codigoIva,
            })),
        }, certService, {
            submissionUUID: crypto.randomUUID(),
            softwareInfoDetail: (0, server_1.getDefaultAgtSoftwareInfoDetail)(),
            eacCode: process.env.AGT_EAC_CODE || '86201',
        });
        const result = await agtApiClient.registarFactura(requestPayload, apiToken || '');
        const hasErrors = result.errorList && result.errorList.length > 0;
        let statusEnvio = hasErrors ? 'ERRO' : 'ENVIADO';
        if (!hasErrors && result.requestID) {
            try {
                const poll = await (0, server_1.pollAgtSubmissionStatus)(() => agtApiClient.obterEstado((0, server_1.buildAgtObterEstadoPayload)(fatura.clinica.nif, result.requestID, certService), apiToken || ''), {
                    maxAttempts: Number(process.env.AGT_POLL_MAX_ATTEMPTS || 5),
                });
                statusEnvio = poll.status;
            }
            catch (pollError) {
                logger.warn({ faturaId, requestID: result.requestID, pollError }, 'Registo aceite; validação assíncrona pendente (obterEstado)');
            }
        }
        await prisma_1.prisma.fatura.update({
            where: { id: faturaId },
            data: {
                statusEnvio,
                agtRequestID: result.requestID || null,
            },
        });
        if (hasErrors) {
            logger.warn({ faturaId, errors: result.errorList }, 'Reporte concluído com erros parciais da AGT');
        }
        else {
            logger.info({ faturaId, requestID: result.requestID, statusEnvio }, 'Reporte concluído com sucesso');
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error({ faturaId, error: errorMessage }, 'Falha crítica no reporte à AGT');
        await prisma_1.prisma.fatura.update({
            where: { id: faturaId },
            data: { statusEnvio: 'ERRO' },
        });
        throw error;
    }
}, {
    connection: redis_1.redis,
    limiter: {
        max: 10,
        duration: 1000,
    },
});
exports.reportAgtWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Job de reporte AGT falhou definitivamente ou aguarda retry');
});
