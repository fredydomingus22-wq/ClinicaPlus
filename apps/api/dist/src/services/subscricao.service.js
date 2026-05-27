"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscricaoService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const notification_service_1 = require("./notification.service");
const date_fns_1 = require("date-fns");
const types_1 = require("@clinicaplus/types");
exports.subscricaoService = {
    /**
     * Creates a new immutable subscription record and updates the clinic cache.
     * This is the only way to change a clinic's plan or subscription state.
     */
    async criarNovaSubscricao(input, tx) {
        const client = tx || prisma_1.prisma;
        const clinica = await client.clinica.findUniqueOrThrow({ where: { id: input.clinicaId } });
        const operation = async (transaction) => {
            // 1. Create new immutable record
            const subscricao = await transaction.subscricao.create({
                data: {
                    clinicaId: input.clinicaId,
                    plano: input.plano,
                    estado: input.estado,
                    inicioEm: new Date(),
                    validaAte: input.validaAte ?? (0, date_fns_1.addMonths)(new Date(), 1),
                    valorKz: input.valorKz ?? null,
                    referenciaInterna: input.referenciaInterna ?? null,
                    razao: input.razao,
                    planoAnterior: clinica.plano,
                    alteradoPor: input.alteradoPor,
                    notas: input.notas ?? null,
                },
            });
            // 2. Update cache on Clinica (atomic transaction)
            await transaction.clinica.update({
                where: { id: input.clinicaId },
                data: {
                    plano: input.plano,
                    subscricaoEstado: input.estado,
                    subscricaoValidaAte: subscricao.validaAte,
                },
            });
            // 3. Audit log
            await transaction.auditLog.create({
                data: {
                    clinicaId: input.clinicaId,
                    actorId: input.alteradoPor,
                    actorTipo: input.alteradoPor === 'sistema' ? 'SISTEMA' : 'UTILIZADOR',
                    accao: 'SUBSCRICAO_ALTERADA',
                    recurso: 'subscricao',
                    recursoId: subscricao.id,
                    metadata: {
                        planoAnterior: clinica.plano,
                        planoNovo: input.plano,
                        razao: input.razao,
                    },
                },
            });
            return subscricao;
        };
        if (tx) {
            return operation(tx);
        }
        else {
            return prisma_1.prisma.$transaction(operation);
        }
    },
    /**
     * Returns the subscription history for a clinic, ordered by creation date descending.
     */
    async historico(clinicaId) {
        return prisma_1.prisma.subscricao.findMany({
            where: { clinicaId },
            orderBy: { criadoEm: 'desc' },
        });
    },
    /**
     * Suspends a clinic's subscription, performing an automatic downgrade to BASIC.
     */
    async suspender(clinicaId) {
        await this.criarNovaSubscricao({
            clinicaId,
            plano: types_1.Plano.BASICO,
            estado: types_1.EstadoSubscricao.SUSPENSA,
            razao: types_1.RazaoMudancaPlano.DOWNGRADE_AUTO,
            alteradoPor: 'sistema',
            notas: 'Suspensão automática por falta de pagamento após grace period',
        });
        // Notify clinic admin via email
        await notification_service_1.notificationService.enviarEmailContaSuspensa(clinicaId);
    },
    /**
     * Verifies if a clinic has reached its limit for a specific resource.
     * Throws AppError with PLAN_LIMIT_REACHED if limit exceeded.
     */
    async verificarLimite(clinicaId, recurso) {
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
        });
        const limites = await prisma_1.prisma.planoLimite.findUniqueOrThrow({
            where: { plano: clinica.plano }
        });
        const contagens = {
            medicos: () => prisma_1.prisma.medico.count({ where: { clinicaId, ativo: true } }),
            consultas: () => prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    dataHora: { gte: (0, date_fns_1.startOfMonth)(new Date()) }
                }
            }),
            pacientes: () => prisma_1.prisma.paciente.count({ where: { clinicaId } }),
            apikeys: () => prisma_1.prisma.apiKey.count({ where: { clinicaId, ativo: true } }),
            webhooks: () => prisma_1.prisma.webhook.count({ where: { clinicaId, ativo: true } }),
        };
        const limiteCampo = {
            medicos: 'maxMedicos',
            consultas: 'maxConsultasMes',
            pacientes: 'maxPacientes',
            apikeys: 'maxApiKeys',
            webhooks: 'maxWebhooks',
        };
        const limiteValue = limites[limiteCampo[recurso]];
        // -1 means unlimited
        if (limiteValue === -1)
            return;
        const actual = await (contagens[recurso])();
        if (actual >= limiteValue) {
            throw new AppError_1.AppError(`Limite do plano ${clinica.plano}: máximo ${limiteValue} ${recurso}.`, 402, 'PLAN_LIMIT_REACHED', { recurso, limite: limiteValue, actual, plano: clinica.plano });
        }
    },
    /**
     * Returns current subscription status, limits, and features.
     */
    async getActual(clinicaId) {
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
        });
        const uso = await this.getUso(clinicaId);
        const validaAte = clinica.subscricaoValidaAte ? new Date(clinica.subscricaoValidaAte) : null;
        const diasRestantes = validaAte
            ? Math.max(0, (0, date_fns_1.differenceInCalendarDays)(validaAte, new Date()))
            : 0;
        const features = {
            BASICO: {
                exportCsv: false,
                webhooks: false,
                whatsappAutomacoes: false,
                relatoriosHistorico: 'MES_CORRENTE',
                multiLocalizacao: false,
            },
            PRO: {
                exportCsv: true,
                webhooks: true,
                whatsappAutomacoes: true,
                relatoriosHistorico: '12_MESES',
                multiLocalizacao: false,
            },
            ENTERPRISE: {
                exportCsv: true,
                webhooks: true,
                whatsappAutomacoes: true,
                relatoriosHistorico: 'ILIMITADO',
                multiLocalizacao: true,
            },
        }[clinica.plano];
        return {
            plano: clinica.plano,
            estado: clinica.subscricaoEstado,
            validaAte: clinica.subscricaoValidaAte,
            diasRestantes,
            emGracePeriod: clinica.subscricaoEstado === types_1.EstadoSubscricao.GRACE_PERIOD,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            limites: uso,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            features: features,
        };
    },
    /**
     * Returns current usage vs limits for all critical resources.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getUso(clinicaId) {
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
        });
        const limites = await prisma_1.prisma.planoLimite.findUniqueOrThrow({
            where: { plano: clinica.plano }
        });
        const [medicos, consultas, pacientes, apiKeys] = await Promise.all([
            prisma_1.prisma.medico.count({ where: { clinicaId, ativo: true } }),
            prisma_1.prisma.agendamento.count({
                where: { clinicaId, dataHora: { gte: (0, date_fns_1.startOfMonth)(new Date()) } }
            }),
            prisma_1.prisma.paciente.count({ where: { clinicaId } }),
            prisma_1.prisma.apiKey.count({ where: { clinicaId, ativo: true } }),
        ]);
        const formatLimit = (actual, maximo) => ({
            maximo,
            actual,
            percentagem: maximo === -1 ? null : Math.round((actual / maximo) * 100),
        });
        return {
            medicos: formatLimit(medicos, limites.maxMedicos),
            consultas: formatLimit(consultas, limites.maxConsultasMes),
            pacientes: formatLimit(pacientes, limites.maxPacientes),
            apiKeys: formatLimit(apiKeys, limites.maxApiKeys),
        };
    },
    /**
     * Returns clinics with subscriptions expiring in the next 30 days.
     */
    async getExpiringSoon() {
        const dataLimite = (0, date_fns_1.addDays)(new Date(), 30);
        return prisma_1.prisma.clinica.findMany({
            where: {
                AND: [
                    { subscricaoValidaAte: { lte: dataLimite } },
                    { subscricaoValidaAte: { gte: new Date() } },
                    { subscricaoEstado: { in: [types_1.EstadoSubscricao.ACTIVA, types_1.EstadoSubscricao.TRIAL, types_1.EstadoSubscricao.GRACE_PERIOD] } },
                ]
            },
            select: {
                id: true,
                nome: true,
                plano: true,
                subscricaoEstado: true,
                subscricaoValidaAte: true,
            },
            orderBy: { subscricaoValidaAte: 'asc' }
        });
    },
};
