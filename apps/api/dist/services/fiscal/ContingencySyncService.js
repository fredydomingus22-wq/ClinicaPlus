"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contingencySyncService = exports.ContingencySyncService = void 0;
const prisma_1 = require("../../lib/prisma");
const AgtApiClient_1 = require("./AgtApiClient");
const faturas_service_1 = require("../faturas.service");
const CertificationService_1 = require("./CertificationService");
const logger_1 = require("../../lib/logger");
const server_1 = require("@clinicaplus/utils/server");
const crypto_1 = __importDefault(require("crypto"));
const secretCrypto_1 = require("../../lib/secretCrypto");
class ContingencySyncService {
    /**
     * Periodic job that drains the contingency queue for one clinic.
     */
    async syncPendingDocuments(clinicaId) {
        const clinica = await prisma_1.prisma.clinica.findUnique({ where: { id: clinicaId } });
        if (!clinica)
            return;
        if (!clinica.nif) {
            logger_1.logger.error({ clinicaId }, 'Clinica sem NIF configurado. Sincronizacao de contingencia bloqueada.');
            return;
        }
        const faturasPendentes = await prisma_1.prisma.fatura.findMany({
            where: { clinicaId, statusEnvio: 'CONTINGENCIA', emContingencia: true },
            orderBy: { criadoEm: 'asc' }
        });
        const seriesPendentes = new Map();
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
            const existente = await prisma_1.prisma.sequenciaDocFiscal.findFirst({
                where: {
                    clinicaId,
                    serie: seriePendente.serie,
                    tipoDoc: seriePendente.tipoDoc,
                    anoFiscal: seriePendente.anoFiscal
                }
            });
            if (existente?.isRegistered)
                continue;
            if (existente) {
                const normalizada = await prisma_1.prisma.sequenciaDocFiscal.update({
                    where: { id: existente.id },
                    data: {
                        isContingency: true,
                        isRegistered: false,
                        startTS: existente.startTS ?? seriePendente.startTS,
                        endTS: null
                    }
                });
                seriesContingentes.push(normalizada);
            }
            else {
                const criada = await prisma_1.prisma.sequenciaDocFiscal.create({
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
        const tenantKeys = (0, server_1.resolveAgtTenantKeys)(clinica, secretCrypto_1.decryptSecret);
        const certService = new CertificationService_1.CertificationService(tenantKeys);
        for (const serie of seriesContingentes) {
            try {
                const lastDoc = await prisma_1.prisma.fatura.findFirst({
                    where: { clinicaId, serieDocFiscal: serie.serie, tipoDocFiscal: serie.tipoDoc },
                    orderBy: { criadoEm: 'desc' }
                });
                const endTS = lastDoc ? lastDoc.criadoEm : new Date();
                const softwareInfoDetail = (0, server_1.getDefaultAgtSoftwareInfoDetail)();
                const seriesContingencyIndicator = 'C';
                const request = {
                    schemaVersion: '1.2',
                    submissionUUID: crypto_1.default.randomUUID(),
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
                await AgtApiClient_1.agtApiClient.solicitarSerie(request, (0, server_1.requireAgtBasicAuthFromEnvOrEmptyWhenMock)());
                await prisma_1.prisma.sequenciaDocFiscal.update({
                    where: { id: serie.id },
                    data: { isRegistered: true, isContingency: false, endTS }
                });
                logger_1.logger.info({ serie: serie.serie }, 'Serie de contingencia registada na AGT com sucesso');
            }
            catch (error) {
                logger_1.logger.error({ error, serie: serie.serie }, 'Erro ao registar serie de contingencia na AGT');
                return;
            }
        }
        for (const fatura of faturasPendentes) {
            try {
                await faturas_service_1.faturasService.submeterParaAgt(fatura.id, clinicaId);
                const faturaAtual = await prisma_1.prisma.fatura.findUnique({
                    where: { id: fatura.id },
                    select: { statusEnvio: true }
                });
                if (faturaAtual?.statusEnvio === 'ENTREGUE' || faturaAtual?.statusEnvio === 'ENVIADO') {
                    logger_1.logger.info({ faturaId: fatura.id, statusEnvio: faturaAtual.statusEnvio }, 'Fatura em contingencia submetida com sucesso');
                }
                else {
                    logger_1.logger.warn({ faturaId: fatura.id, statusEnvio: faturaAtual?.statusEnvio }, 'Fatura em contingencia ainda nao foi totalmente sincronizada');
                }
            }
            catch (err) {
                logger_1.logger.error({ err, faturaId: fatura.id }, 'Erro ao sincronizar fatura tardia da contingencia');
            }
        }
        const restamPendentes = await prisma_1.prisma.fatura.count({
            where: { clinicaId, statusEnvio: 'CONTINGENCIA', emContingencia: true }
        });
        if (restamPendentes === 0) {
            logger_1.logger.info({ clinicaId }, 'Todas as faturas em contingencia foram sincronizadas. Finalizando periodo de contingencia.');
            await prisma_1.prisma.sequenciaDocFiscal.updateMany({
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
    async syncAllPending() {
        try {
            const activeContingencies = await prisma_1.prisma.fatura.findMany({
                where: { statusEnvio: 'CONTINGENCIA' },
                distinct: ['clinicaId'],
                select: { clinicaId: true }
            });
            for (const item of activeContingencies) {
                await this.syncPendingDocuments(item.clinicaId);
            }
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Erro ao rodar syncAllPending de contingencia');
        }
    }
}
exports.ContingencySyncService = ContingencySyncService;
exports.contingencySyncService = new ContingencySyncService();
