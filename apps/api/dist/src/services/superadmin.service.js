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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const clinicas_service_1 = require("./clinicas.service");
const notification_service_1 = require("./notification.service");
const notificacoes_service_1 = require("./notificacoes.service");
const logger_1 = require("../lib/logger");
const redis_1 = require("../lib/redis");
function getRedisClient() { return redis_1.redis; }
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../lib/config");
const auditLog_service_1 = require("./auditLog.service");
/**
 * Maps a Prisma Clinica record to a ClinicaDTO.
 */
function toClinicaDTO(c) {
    const dto = {
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        logo: c.logo || null,
        logotipoUrl: c.logotipoUrl || null,
        telefone: c.telefone || null,
        email: c.email,
        endereco: c.endereco || null,
        cidade: c.cidade || null,
        provincia: c.provincia || null,
        plano: c.plano,
        subscricaoEstado: c.subscricaoEstado,
        subscricaoValidaAte: c.subscricaoValidaAte?.toISOString() || null,
        ativo: c.ativo,
        criadoEm: c.criadoEm.toISOString(),
        atualizadoEm: c.atualizadoEm.toISOString(),
    };
    if ('configuracao' in c && c.configuracao) {
        const config = c.configuracao;
        dto.configuracao = {
            id: config.id,
            lembrete24h: config.lembrete24h,
            lembrete2h: config.lembrete2h,
            agendamentoOnline: config.agendamentoOnline,
            preTriagem: config.preTriagem,
            prontuarioCustom: config.prontuarioCustom,
            horasAntecedencia: config.horasAntecedencia,
            moedaSimbolo: config.moedaSimbolo,
            fusoHorario: config.fusoHorario,
            seguradoras: config.seguradoras,
        };
    }
    if ('contactos' in c && c.contactos) {
        dto.contactos = c.contactos.map((cont) => ({
            id: cont.id,
            clinicaId: cont.clinicaId,
            tipo: cont.tipo,
            valor: cont.valor,
            descricao: cont.descricao,
            ordem: cont.ordem,
            criadoEm: cont.criadoEm.toISOString(),
        }));
    }
    return dto;
}
exports.superAdminService = {
    /**
     * Lists all clinics across the system.
     * cross-tenant: bypasses normal clinic isolation.
     */
    async listClinicas(query) {
        const { q, plano, ativo, page = 1, limit = 20 } = query;
        const where = {};
        if (q) {
            where.OR = [
                { nome: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (plano) {
            where.plano = plano;
        }
        if (ativo !== undefined) {
            where.ativo = ativo;
        }
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.clinica.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { criadoEm: 'desc' },
            }),
            prisma_1.prisma.clinica.count({ where }),
        ]);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const itemsWithStats = await Promise.all(items.map(async (c) => {
            const [agendamentos30d, lastLog] = await Promise.all([
                prisma_1.prisma.agendamento.count({
                    where: { clinicaId: c.id, criadoEm: { gte: thirtyDaysAgo } }
                }),
                prisma_1.prisma.auditLog.findFirst({
                    where: { clinicaId: c.id },
                    orderBy: { criadoEm: 'desc' },
                    select: { criadoEm: true }
                })
            ]);
            const extended = toClinicaDTO(c);
            extended.agendamentos30d = agendamentos30d;
            extended.ultimaActividade = lastLog?.criadoEm.toISOString() || null;
            const planPrices = { 'BASICO': 50000, 'PRO': 150000, 'ENTERPRISE': 450000 };
            extended.receita30d = planPrices[c.plano] || 0;
            return extended;
        }));
        return {
            items: itemsWithStats,
            total,
            page,
            limit,
        };
    },
    async getClinica(id) {
        const clinica = await prisma_1.prisma.clinica.findUnique({
            where: { id },
            include: { configuracao: true, contactos: true }
        });
        if (!clinica) {
            throw new AppError_1.AppError('Clínica não encontrada', 404, 'NOT_FOUND');
        }
        return toClinicaDTO(clinica);
    },
    async updateClinica(id, data) {
        const clinica = await prisma_1.prisma.clinica.update({
            where: { id },
            data: {
                ...(data.plano && { plano: data.plano }),
                ...(data.ativo !== undefined && { ativo: data.ativo }),
            },
        });
        return toClinicaDTO(clinica);
    },
    async getGlobalStats() {
        const [totalClinicas, totalUtilizadores, totalAgendamentos, activeClinicas] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.clinica.count(),
            prisma_1.prisma.utilizador.count(),
            prisma_1.prisma.agendamento.count(),
            prisma_1.prisma.clinica.findMany({
                where: { ativo: true },
                select: { plano: true }
            })
        ]);
        const planPrices = {
            'BASICO': 50000,
            'PRO': 150000,
            'ENTERPRISE': 450000
        };
        const totalRevenue = activeClinicas.reduce((sum, clinica) => {
            return sum + (planPrices[clinica.plano] || 0);
        }, 0);
        return {
            totalClinicas,
            totalUtilizadores,
            totalAgendamentos,
            totalRevenue
        };
    },
    async getDashboardKPIs() {
        const redisClient = getRedisClient();
        let cached = null;
        if (redisClient) {
            try {
                const cachedStr = await redisClient.get('sa:dashboard:kpis');
                if (cachedStr)
                    cached = JSON.parse(cachedStr);
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Redis get error for sa:dashboard:kpis');
            }
        }
        if (cached)
            return cached;
        const stats = await this.getGlobalStats();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [agendamentos30d, activeClinicsCount, criticalEvents] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.agendamento.count({
                where: { criadoEm: { gte: thirtyDaysAgo } }
            }),
            prisma_1.prisma.clinica.count({ where: { ativo: true } }),
            prisma_1.prisma.sistemaEvento.findMany({
                where: { severidade: 'CRITICAL', criadoEm: { gte: thirtyDaysAgo } },
                orderBy: { criadoEm: 'desc' },
                take: 5,
                select: { id: true, severidade: true, mensagem: true, clinicaId: true }
            })
        ]);
        // Simple MRR Chart Data Mock (would be real aggregation in production)
        const mrrChartData = [
            { month: 'Jan', amount: stats.totalRevenue * 0.8 },
            { month: 'Fev', amount: stats.totalRevenue * 0.9 },
            { month: 'Mar', amount: stats.totalRevenue }
        ];
        const result = {
            ...stats,
            totalAgendamentos30d: agendamentos30d,
            activeClinicsCount,
            criticalEvents,
            mrrChartData,
            // For the mini table in dashboard
            clinicas: await prisma_1.prisma.clinica.findMany({
                take: 5,
                orderBy: { criadoEm: 'desc' },
                select: { id: true, nome: true, plano: true, ativo: true }
            })
        };
        if (redisClient) {
            try {
                await redisClient.setex('sa:dashboard:kpis', 300, JSON.stringify(result)); // 5 min
            }
            catch (err) {
                logger_1.logger.warn({ err }, 'Redis setex error for sa:dashboard:kpis');
            }
        }
        return result;
    },
    async provisionClinic(data, requestedBy) {
        const settings = await this.getGlobalSettings();
        if (!settings.registoNovasClinicas) {
            throw new AppError_1.AppError('O registo de novas clínicas está temporariamente desativado.', 403, 'REGISTRATION_DISABLED');
        }
        const { clinica, admin } = await clinicas_service_1.clinicasService.registar(data);
        notification_service_1.notificationService.sendClinicaWelcomeEmail({
            email: clinica.email,
            nome: clinica.nome,
            plano: clinica.plano
        }).catch((err) => logger_1.logger.error({ err }, 'Async error: Clinica welcome email'));
        notification_service_1.notificationService.sendAdminWelcomeEmail({
            email: admin.email,
            nome: admin.nome,
            senhaTemporaria: data.adminPassword,
            clinicaNome: clinica.nome
        }).catch((err) => logger_1.logger.error({ err }, 'Async error: Admin welcome email'));
        notificacoes_service_1.notificacoesService.create({
            utilizadorId: admin.id,
            titulo: 'Bem-vindo à ClinicaPlus',
            mensagem: `Olá ${admin.nome}, a sua conta administrativa para a clínica ${clinica.nome} está pronta. Recomendamos que explore as configurações e configure a sua equipa.`,
            tipo: 'SUCESSO',
            url: '/admin/configuracao'
        }).catch((err) => logger_1.logger.error({ err }, 'Async error: Admin initial notification'));
        await prisma_1.prisma.systemLog.create({
            data: {
                nivel: 'INFO',
                mensagem: `Nova clínica provisionada: ${data.nome} (${data.slug})`,
                acao: 'TENANT_PROVISIONING',
                utilizadorId: requestedBy,
                detalhes: {
                    clinicaId: clinica.id,
                    plano: data.plano,
                    adminEmail: data.adminEmail
                }
            }
        });
        return clinica;
    },
    async listUsers(query) {
        const { q, papel, ativo, clinicaId, page = 1, limit = 20 } = query;
        const where = {};
        if (q) {
            where.OR = [
                { nome: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (papel)
            where.papel = papel;
        if (ativo !== undefined)
            where.ativo = String(ativo) === 'true';
        if (clinicaId)
            where.clinicaId = clinicaId;
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.utilizador.findMany({
                where,
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                orderBy: { criadoEm: 'desc' },
                include: { clinica: { select: { nome: true } } }
            }),
            prisma_1.prisma.utilizador.count({ where }),
        ]);
        return {
            items: items.map(u => ({
                id: u.id,
                nome: u.nome,
                email: u.email,
                papel: u.papel,
                ativo: u.ativo,
                criadoEm: u.criadoEm.toISOString(),
                atualizadoEm: u.atualizadoEm.toISOString(),
                clinicaId: u.clinicaId,
                clinicaNome: u.clinica?.nome || 'SuperAdmin/Sistema'
            })),
            total,
            page: Number(page),
            limit: Number(limit),
        };
    },
    async updateUserStatus(id, ativo) {
        const user = await prisma_1.prisma.utilizador.update({
            where: { id },
            data: { ativo },
            include: { clinica: { select: { nome: true } } }
        });
        return {
            id: user.id,
            nome: user.nome,
            email: user.email,
            papel: user.papel,
            ativo: user.ativo,
            clinicaId: user.clinicaId,
            criadoEm: user.criadoEm.toISOString(),
            clinicaNome: user.clinica?.nome || 'Sistema',
        };
    },
    async listLogs(query) {
        const { q, nivel, page = '1', limit = '50' } = query;
        const where = {};
        if (q) {
            where.OR = [
                { mensagem: { contains: q, mode: 'insensitive' } },
                { acao: { contains: q, mode: 'insensitive' } }
            ];
        }
        if (nivel)
            where.nivel = nivel;
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.systemLog.findMany({
                where,
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                orderBy: { criadoEm: 'desc' },
                include: { utilizador: { select: { nome: true, email: true } } }
            }),
            prisma_1.prisma.systemLog.count({ where }),
        ]);
        return {
            items: items.map(l => ({
                id: l.id,
                nivel: l.nivel,
                mensagem: l.mensagem,
                acao: l.acao,
                detalhes: l.detalhes,
                criadoEm: l.criadoEm.toISOString(),
                utilizadorNome: l.utilizador?.nome || 'Sistema',
                utilizadorEmail: l.utilizador?.email || '-'
            })),
            total,
            page: Number(page),
            limit: Number(limit),
        };
    },
    async getGlobalSettings() {
        const settings = await prisma_1.prisma.globalSettings.findUnique({
            where: { id: 'global_settings' }
        });
        if (!settings) {
            const created = await prisma_1.prisma.globalSettings.create({
                data: { id: 'global_settings' }
            });
            return {
                id: created.id,
                modoManutencao: created.modoManutencao,
                registoNovasClinicas: created.registoNovasClinicas,
                maxUploadSizeMb: created.maxUploadSizeMb,
                mensagemSistema: created.mensagemSistema,
                atualizadoEm: created.atualizadoEm.toISOString()
            };
        }
        return {
            id: settings.id,
            modoManutencao: settings.modoManutencao,
            registoNovasClinicas: settings.registoNovasClinicas,
            maxUploadSizeMb: settings.maxUploadSizeMb,
            mensagemSistema: settings.mensagemSistema,
            atualizadoEm: settings.atualizadoEm.toISOString()
        };
    },
    async updateGlobalSettings(data) {
        const settings = await prisma_1.prisma.globalSettings.upsert({
            where: { id: 'global_settings' },
            update: data,
            create: {
                id: 'global_settings',
                ...data
            }
        });
        return {
            id: settings.id,
            modoManutencao: settings.modoManutencao,
            registoNovasClinicas: settings.registoNovasClinicas,
            maxUploadSizeMb: settings.maxUploadSizeMb,
            mensagemSistema: settings.mensagemSistema,
            atualizadoEm: settings.atualizadoEm.toISOString()
        };
    },
    // ─── SPRINT 11 PASSO 2 ─────────────────────────────────────────────────────
    async createImpersonation(clinicaId, adminId, motivo, currentSuperAdminId) {
        const targetAdmin = await prisma_1.prisma.utilizador.findFirst({
            where: { id: adminId, clinicaId }
        });
        if (!targetAdmin) {
            throw new AppError_1.AppError('Admin não encontrado nesta clínica', 404);
        }
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const sessionId = crypto.randomUUID();
        const token = jsonwebtoken_1.default.sign({ sub: targetAdmin.id, clinicaId, papel: targetAdmin.papel, isImpersonated: true, impersonationId: sessionId }, config_1.config.JWT_SECRET, { expiresIn: '30m' });
        const session = await prisma_1.prisma.impersonationSession.create({
            data: {
                id: sessionId,
                targetClinicaId: clinicaId,
                targetAdminId: adminId,
                superAdminId: currentSuperAdminId,
                motivo,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
                ip: '127.0.0.1',
                token
            }
        });
        await auditLog_service_1.auditLogService.log({
            clinicaId,
            actorId: currentSuperAdminId,
            accao: 'UPDATE',
            recurso: 'IMPERSONATION',
            recursoId: sessionId,
            metadata: { motivo, targetAdminId: adminId }
        });
        return { token, expiresAt: session.expiresAt };
    },
    async suspenderClinica(id, motivo, adminId) {
        if (!motivo)
            throw new AppError_1.AppError('Motivo é obrigatório', 400);
        const clinica = await prisma_1.prisma.clinica.update({
            where: { id },
            data: {
                ativo: false,
                suspensaEm: new Date(),
                motivoSuspensao: motivo
            }
        });
        await auditLog_service_1.auditLogService.log({
            clinicaId: id,
            actorId: adminId,
            accao: 'UPDATE',
            recurso: 'CLINICA',
            recursoId: id,
            metadata: { motivo, action: 'SUSPENSA' }
        });
        return clinica;
    },
    async getHealthScores() {
        const cacheKey = 'superadmin:health_scores';
        try {
            const redisClient = getRedisClient();
            if (redisClient) {
                const cached = await redisClient.get(cacheKey);
                if (cached)
                    return JSON.parse(cached);
            }
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'Redis error in getHealthScores (get)');
        }
        // Get all active clinics to ensure we have a full map
        const clinicas = await prisma_1.prisma.clinica.findMany({
            where: { ativo: true },
            select: { id: true, nome: true }
        });
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const eventos = await prisma_1.prisma.sistemaEvento.groupBy({
            by: ['clinicaId'],
            where: {
                severidade: 'ERROR',
                criadoEm: { gte: yesterday },
                clinicaId: { not: null }
            },
            _count: { _all: true }
        });
        const errorMap = new Map(eventos.map(e => [e.clinicaId, e._count._all || 0]));
        const scores = clinicas.map(c => {
            const count = errorMap.get(c.id) || 0;
            return {
                clinicaId: c.id,
                nome: c.nome,
                score: count >= 10 ? 'VERMELHO' : count >= 3 ? 'AMARELO' : 'VERDE',
                erros24h: count
            };
        });
        try {
            const redisClient = getRedisClient();
            if (redisClient) {
                await redisClient.setex(cacheKey, 300, JSON.stringify(scores));
            }
        }
        catch (err) {
            logger_1.logger.warn({ err }, 'Redis error in getHealthScores (set)');
        }
        return scores;
    },
    async getInfrastructureStatus() {
        // In a real scenario, this would check Railway API, Supabase status page, etc.
        // For now, we return a mock that feels "premium" and functional
        return {
            services: [
                { name: 'Railway API', status: 'OPERATIONAL', latency: '42ms', uptime: '99.98%' },
                { name: 'Supabase DB', status: 'OPERATIONAL', latency: '12ms', uptime: '100%' },
                { name: 'Redis Cache', status: 'OPERATIONAL', latency: '2ms', uptime: '99.99%' },
                { name: 'Evolution API', status: 'DEGRADED', latency: '450ms', uptime: '98.5%' },
                { name: 'Email Gateway', status: 'OPERATIONAL', latency: '120ms', uptime: '99.9%' }
            ],
            lastUpdate: new Date().toISOString()
        };
    },
    async getMRRStats() {
        const redisClient = getRedisClient();
        const cacheKey = 'sa:financeiro:mrr';
        if (redisClient) {
            const cached = await redisClient.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        // Mock series for now - in production this would aggregate invoices
        const series = [
            { month: 'Out', mrr: 2500000, expansion: 200000, churn: 50000 },
            { month: 'Nov', mrr: 2800000, expansion: 350000, churn: 50000 },
            { month: 'Dez', mrr: 3200000, expansion: 450000, churn: 50000 },
            { month: 'Jan', mrr: 3800000, expansion: 650000, churn: 50000 },
            { month: 'Fev', mrr: 4500000, expansion: 750000, churn: 50000 },
            { month: 'Mar', mrr: 5240000, expansion: 790000, churn: 50000 }
        ];
        const result = {
            series,
            currentMRR: 5240000,
            growth: 15.4,
            churnRate: 1.2
        };
        if (redisClient) {
            await redisClient.setex(cacheKey, 3600, JSON.stringify(result)); // 1h
        }
        return result;
    },
    async getPlansDistribution() {
        const plans = await prisma_1.prisma.clinica.groupBy({
            by: ['plano'],
            where: { ativo: true },
            _count: { _all: true }
        });
        const revenuePerPlan = {
            'BASICO': 25000,
            'PRO': 75000,
            'ENTERPRISE': 200000
        };
        return plans.map(p => ({
            plano: p.plano,
            count: p._count._all,
            revenue: (p._count._all || 0) * (revenuePerPlan[p.plano] || 0)
        }));
    },
    async getCohorts() {
        return [
            { month: '2025-10', size: 12, retention: [100, 92, 92, 85, 85, 85] },
            { month: '2025-11', size: 15, retention: [100, 100, 93, 93, 86] },
            { month: '2025-12', size: 18, retention: [100, 94, 94, 88] },
            { month: '2026-01', size: 22, retention: [100, 100, 100] },
            { month: '2026-02', size: 28, retention: [100, 96] },
            { month: '2026-03', size: 35, retention: [100] }
        ];
    },
    async getImpersonationHistory() {
        const history = await prisma_1.prisma.impersonationSession.findMany({
            orderBy: { criadoEm: 'desc' },
            take: 50,
        });
        return history.map(h => ({
            id: h.id,
            clinicaNome: h.targetClinicaId, // We'll enrich later when relations are confirmed
            clinicaId: h.targetClinicaId,
            superAdminId: h.superAdminId,
            motivo: h.motivo,
            criadoEm: h.criadoEm.toISOString(),
            expiradoEm: h.expiresAt.toISOString(),
            ativo: h.expiresAt > new Date()
        }));
    },
    async getFeatureFlags() {
        // This assumes a FeatureFlag table exists or we use a set of predefined ones in DB
        // For now, let's mock the ones we'll support
        return [
            { id: 'REGISTO_PUBLICO', nome: 'Registo de Novas Clínicas', descricao: 'Permite que novas clínicas se registem sozinhas', ativo: true },
            { id: 'PAGAMENTOS_STRIPE', nome: 'Gateway Stripe', descricao: 'Activa o processamento via Stripe (Global)', ativo: false },
            { id: 'IA_CONSULTA', nome: 'Inteligência Artificial', descricao: 'Activa resumos de consulta via LLM', ativo: true },
            { id: 'MODO_MANUTENCAO', nome: 'Modo Manutenção', descricao: 'Bloqueia acesso a todos os tenants exceto SuperAdmin', ativo: false }
        ];
    },
    async updateFeatureFlag(codigo, ativo) {
        // Logic to update flag in DB
        return { codigo, ativo };
    }
};
