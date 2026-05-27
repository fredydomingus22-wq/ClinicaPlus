"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waInstanciaService = void 0;
const prisma_1 = require("../lib/prisma");
const evolutionApi_1 = require("../lib/evolutionApi");
const eventBus_1 = require("../lib/eventBus");
const client_1 = require("@prisma/client");
const logger_1 = require("../lib/logger");
const auditLog_service_1 = require("./auditLog.service");
const redis_1 = require("../lib/redis");
const crypto_1 = __importDefault(require("crypto"));
const CACHE_PREFIX = 'wa:instance:';
exports.waInstanciaService = {
    /**
     * Limpa o cache da instância no Redis
     */
    async clearCache(evolutionName) {
        try {
            await redis_1.redis.del(`${CACHE_PREFIX}${evolutionName}`);
        }
        catch (err) {
            logger_1.logger.error({ evolutionName, err }, 'Erro ao limpar cache da instância');
        }
    },
    /**
     * Busca todas as instâncias de uma clínica
     */
    async listarPorClinica(clinicaId) {
        return prisma_1.prisma.waInstancia.findMany({
            where: { clinicaId },
            orderBy: { criadoEm: 'asc' }
        });
    },
    /**
     * Busca uma instância específica por ID
     */
    async obterPorId(id, clinicaId) {
        return prisma_1.prisma.waInstancia.findFirst({
            where: { id, clinicaId },
        });
    },
    /**
     * Helper interno para buscar instância ou lançar erro
     */
    async getInstanciaOrThrow(id, clinicaId) {
        const instancia = await this.obterPorId(id, clinicaId);
        if (!instancia) {
            throw new Error('Instância do WhatsApp não encontrada para esta clínica.');
        }
        return instancia;
    },
    async criar(clinicaId, userId) {
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
        });
        if (clinica.plano !== client_1.Plano.PRO && clinica.plano !== client_1.Plano.ENTERPRISE) {
            throw new Error('Módulo WhatsApp apenas disponível para planos PRO ou superiores.');
        }
        // Verificar se já existe uma instância (MODULE-whatsapp.md §6)
        const existente = await prisma_1.prisma.waInstancia.findFirst({
            where: { clinicaId }
        });
        if (existente && clinica.plano !== client_1.Plano.ENTERPRISE) {
            throw new Error('Esta clínica já possui uma instância de WhatsApp configurada. Actualize para ENTERPRISE para múltiplos números.');
        }
        // Formato: cp-{slug}-{random6} (MODULE-whatsapp.md §6)
        const instanceName = `cp-${clinica.slug}-${crypto_1.default.randomBytes(3).toString('hex')}`;
        // O webhook aponta agora diretamente para a Engine NLU FastAPI
        const intelUrl = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
        const webhookUrl = `${intelUrl}/webhook/whatsapp`;
        const evolutionToken = crypto_1.default.randomUUID();
        await evolutionApi_1.evolutionApi.criarInstancia(instanceName, webhookUrl);
        let qrCodeBase64 = null;
        // Tentativa inicial de obter QR code (Evolution pode demorar uns ms)
        try {
            // Pequeno delay para dar tempo à Evolution de inicializar a sessão Baileys
            await new Promise(resolve => setTimeout(resolve, 1500));
            const res = await evolutionApi_1.evolutionApi.obterQrCode(instanceName);
            qrCodeBase64 = res.base64;
        }
        catch {
            logger_1.logger.warn({ instanceName }, 'Não foi possível obter QR inicial após criação. O polling tratará do resto.');
        }
        const qrExpiresAt = qrCodeBase64 ? new Date(Date.now() + 60000) : null;
        const instancia = await prisma_1.prisma.waInstancia.create({
            data: {
                clinicaId,
                evolutionName: instanceName,
                evolutionToken,
                qrCodeBase64,
                qrExpiresAt,
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                atualizadoEm: new Date(),
            },
        });
        await auditLog_service_1.auditLogService.log({
            actorId: userId,
            clinicaId,
            accao: 'CREATE',
            recurso: 'wa_instancia',
            recursoId: instancia.id,
            depois: { evolutionName: instanceName, estado: client_1.WaEstadoInstancia.AGUARDA_QR }
        });
        return instancia;
    },
    async obterQrCode(id, clinicaId) {
        const instancia = await this.getInstanciaOrThrow(id, clinicaId);
        try {
            const { base64 } = await evolutionApi_1.evolutionApi.obterQrCode(instancia.evolutionName);
            const qrExpiresAt = new Date(Date.now() + 60000);
            await prisma_1.prisma.waInstancia.update({
                where: { id: instancia.id },
                data: {
                    qrCodeBase64: base64,
                    qrExpiresAt,
                    estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                    atualizadoEm: new Date()
                },
            });
            await this.clearCache(instancia.evolutionName);
            await (0, eventBus_1.publishEvent)(`clinica:${clinicaId}`, 'whatsapp:qrcode', {
                instanciaId: instancia.id,
                qrCode: base64,
                expiresAt: qrExpiresAt
            });
            return { qrcode: base64 };
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                const errorWithResponse = error;
                if (errorWithResponse.response?.status === 404 || errorWithResponse.message?.includes('404')) {
                    logger_1.logger.warn({ clinicaId, id }, 'Instância 404 na Evolution. Tentando auto-recuperação...');
                    try {
                        const intelUrl = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
                        const webhookUrl = `${intelUrl}/webhook/whatsapp`;
                        await evolutionApi_1.evolutionApi.criarInstancia(instancia.evolutionName, webhookUrl);
                        const res = await evolutionApi_1.evolutionApi.obterQrCode(instancia.evolutionName);
                        await prisma_1.prisma.waInstancia.update({
                            where: { id: instancia.id },
                            data: {
                                qrCodeBase64: res.base64,
                                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                            },
                        });
                        return { qrcode: res.base64 };
                    }
                    catch {
                        logger_1.logger.error({ id }, 'Falha na auto-recuperação de instância');
                        throw error;
                    }
                }
            }
            throw error;
        }
    },
    async processarQrCode(evolutionName, qrBase64) {
        const instancia = await prisma_1.prisma.waInstancia.findUnique({
            where: { evolutionName }
        });
        if (!instancia)
            return;
        await prisma_1.prisma.waInstancia.update({
            where: { id: instancia.id },
            data: {
                qrCodeBase64: qrBase64,
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                atualizadoEm: new Date()
            },
        });
        await this.clearCache(evolutionName);
        await (0, eventBus_1.publishEvent)(`clinica:${instancia.clinicaId}`, 'whatsapp:qrcode', {
            instanciaId: instancia.id,
            qrCodeBase64: qrBase64,
        });
    },
    async processarConexao(evolutionName, state, numeroTelefone) {
        const instancia = await prisma_1.prisma.waInstancia.findUnique({
            where: { evolutionName }
        });
        if (!instancia)
            return;
        let novoEstado = instancia.estado;
        let keepQr = instancia.qrCodeBase64;
        const isSucesso = ['open', 'CONNECTED', 'authenticated'].includes(state);
        const isErro = ['close', 'refused', 'rejected'].includes(state);
        const isPendente = ['connecting', 'pairing'].includes(state);
        if (isSucesso) {
            novoEstado = client_1.WaEstadoInstancia.CONECTADO;
            keepQr = null;
        }
        else if (isErro) {
            novoEstado = client_1.WaEstadoInstancia.DESCONECTADO;
            keepQr = null;
        }
        else if (isPendente) {
            novoEstado = client_1.WaEstadoInstancia.AGUARDA_QR;
        }
        if (novoEstado !== instancia.estado || keepQr !== instancia.qrCodeBase64) {
            logger_1.logger.info({ evolutionName, old: instancia.estado, new: novoEstado, state }, 'Estado da instância actualizado via Webhook');
            await prisma_1.prisma.waInstancia.update({
                where: { id: instancia.id },
                data: {
                    estado: novoEstado,
                    qrCodeBase64: keepQr,
                    atualizadoEm: new Date(),
                    ...(numeroTelefone && { numeroTelefone }),
                },
            });
            await this.clearCache(evolutionName);
        }
        await (0, eventBus_1.publishEvent)(`clinica:${instancia.clinicaId}`, 'whatsapp:estado', {
            instanciaId: instancia.id,
            estado: novoEstado,
        });
    },
    async sincronizarEstado(id, clinicaId) {
        const instancia = await this.getInstanciaOrThrow(id, clinicaId);
        try {
            const resp = await evolutionApi_1.evolutionApi.estadoConexao(instancia.evolutionName);
            logger_1.logger.info({ id, evolutionName: instancia.evolutionName, resp }, 'Sincronização activa: Resposta da Evolution API');
            let novoEstado = instancia.estado;
            let keepQr = instancia.qrCodeBase64;
            let numeroTelefone = instancia.numeroTelefone;
            const safeState = (resp.instance?.state || '').toLowerCase();
            const isSucesso = ['open', 'connected', 'authenticated'].includes(safeState);
            const isErro = ['close', 'refused', 'rejected', 'disconnected'].includes(safeState);
            const isPendente = ['connecting', 'pairing'].includes(safeState);
            if (isSucesso) {
                novoEstado = client_1.WaEstadoInstancia.CONECTADO;
                keepQr = null;
                // Se conectou e não temos o número, tentar recuperar activamente
                if (!numeroTelefone) {
                    try {
                        const detalhes = await evolutionApi_1.evolutionApi.obterDetalhes(instancia.evolutionName);
                        if (detalhes.number) {
                            numeroTelefone = detalhes.number;
                            logger_1.logger.info({ id, numeroTelefone }, 'Número de telefone recuperado durante sincronização activa');
                        }
                    }
                    catch (err) {
                        logger_1.logger.warn({ id, err }, 'Não foi possível recuperar detalhes da instância durante a sincronização');
                    }
                }
            }
            else if (isErro) {
                novoEstado = client_1.WaEstadoInstancia.DESCONECTADO;
                keepQr = null;
            }
            else if (isPendente) {
                novoEstado = client_1.WaEstadoInstancia.AGUARDA_QR;
            }
            if (novoEstado !== instancia.estado || keepQr !== instancia.qrCodeBase64) {
                logger_1.logger.info({ id, old: instancia.estado, new: novoEstado }, 'Persistindo novo estado sincronizado');
                const updated = await prisma_1.prisma.waInstancia.update({
                    where: { id: instancia.id },
                    data: {
                        estado: novoEstado,
                        qrCodeBase64: keepQr,
                        numeroTelefone,
                        atualizadoEm: new Date()
                    },
                });
                await this.clearCache(instancia.evolutionName);
                return updated;
            }
            return instancia;
        }
        catch (err) {
            logger_1.logger.error({ id, err }, 'Falha crítica na sincronização com Evolution API');
            return instancia;
        }
    },
    async desligar(id, clinicaId) {
        const instancia = await this.getInstanciaOrThrow(id, clinicaId);
        try {
            await evolutionApi_1.evolutionApi.desligar(instancia.evolutionName);
        }
        catch {
            // Ignorar se já estiver offline
        }
        await prisma_1.prisma.waInstancia.update({
            where: { id: instancia.id },
            data: {
                estado: client_1.WaEstadoInstancia.DESCONECTADO,
                qrCodeBase64: null,
                atualizadoEm: new Date()
            },
        });
        await this.clearCache(instancia.evolutionName);
    },
    async eliminar(id, clinicaId) {
        const instancia = await this.getInstanciaOrThrow(id, clinicaId);
        try {
            await evolutionApi_1.evolutionApi.eliminar(instancia.evolutionName);
        }
        catch {
            // Ignorar
        }
        await prisma_1.prisma.waInstancia.delete({
            where: { id: instancia.id },
        });
        await this.clearCache(instancia.evolutionName);
    }
};
