"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planEnforcementService = void 0;
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const ENFORCEMENT_DATE = new Date('2026-03-27T00:00:00Z'); // Data de ativação do enforcement
const GRACE_PERIOD_DAYS = 30;
exports.planEnforcementService = {
    /**
     * Verifies if a clinic has reached its limit for a specific resource.
     * Throws 402 Payment Required if limit is reached.
     */
    async check(clinicaId, recurso) {
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
            select: { plano: true },
        });
        const limites = await prisma_1.prisma.planoLimite.findUniqueOrThrow({
            where: { plano: clinica.plano },
        });
        // 1. Verificar Grace Period para BASICO
        const isBasico = clinica.plano === 'BASICO';
        if (isBasico) {
            const dbClinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
                where: { id: clinicaId },
                select: { criadoEm: true }
            });
            const daysSinceEnforcement = Math.floor((Date.now() - ENFORCEMENT_DATE.getTime()) / (1000 * 60 * 60 * 24));
            const createdBeforeEnforcement = dbClinica.criadoEm < ENFORCEMENT_DATE;
            // Se criada antes e ainda estamos nos primeiros 30 dias de enforcement
            if (createdBeforeEnforcement && daysSinceEnforcement >= 0 && daysSinceEnforcement < GRACE_PERIOD_DAYS) {
                return; // Permitir operação (Grace Period ativo)
            }
        }
        if (recurso === 'medicos' && limites.maxMedicos !== -1) {
            const n = await prisma_1.prisma.medico.count({
                where: { clinicaId, ativo: true },
            });
            if (n >= limites.maxMedicos) {
                throw new AppError_1.AppError(`Limite do plano ${clinica.plano}: máximo ${limites.maxMedicos} médicos ativos. Faça upgrade para desbloquear mais.`, 402, 'PLAN_LIMIT_REACHED');
            }
        }
        if (recurso === 'consultas' && limites.maxConsultasMes !== -1) {
            const now = new Date();
            const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
            const n = await prisma_1.prisma.agendamento.count({
                where: {
                    clinicaId,
                    criadoEm: { gte: inicioMes },
                },
            });
            if (n >= limites.maxConsultasMes) {
                throw new AppError_1.AppError(`Limite mensal de ${limites.maxConsultasMes} consultas atingido para o plano ${clinica.plano}.`, 402, 'PLAN_LIMIT_REACHED');
            }
        }
        if (recurso === 'pacientes' && limites.maxPacientes !== -1) {
            const n = await prisma_1.prisma.paciente.count({
                where: { clinicaId },
            });
            if (n >= limites.maxPacientes) {
                throw new AppError_1.AppError(`Limite do plano ${clinica.plano}: máximo ${limites.maxPacientes} pacientes.`, 402, 'PLAN_LIMIT_REACHED');
            }
        }
    },
    /**
     * Checks if a feature is available for the given clinic's plan.
     */
    async canUseFeature(clinicaId, feature, params) {
        const clinica = await prisma_1.prisma.clinica.findUniqueOrThrow({
            where: { id: clinicaId },
            select: { plano: true },
        });
        const limites = await prisma_1.prisma.planoLimite.findUniqueOrThrow({
            where: { plano: clinica.plano },
        });
        // Handle boolean features directly from DB
        const featureMap = {
            apiKey: limites.apiKeyPermitido,
            webhook: limites.webhookPermitido,
            relatoriosHist: limites.relatoriosHist,
            export: limites.exportPermitido,
        };
        let allowed = featureMap[feature];
        // Special logic for historical reports even if allowed in general
        if (feature === 'relatoriosHist' && allowed && params?.dataInicio) {
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            // If historical reports are NOT allowed for BASIC (which is false anyway), 
            // but here we check if even allowed plans are restricted by date (though PRO usually allows all history).
            // Based on MODULE-plataforma.md, BASICO has relatoriosHist: false.
            if (!limites.relatoriosHist && params.dataInicio < currentMonthStart) {
                allowed = false;
            }
        }
        if (!allowed) {
            throw new AppError_1.AppError(`Esta funcionalidade não está incluída no seu plano ${clinica.plano}.`, 402, 'FEATURE_NOT_AVAILABLE');
        }
        return true;
    },
};
