import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';

export type Feature = 'apiKey' | 'webhook' | 'relatoriosHist' | 'export';
export type Resource = 'medicos' | 'consultas' | 'pacientes';

export const planEnforcementService = {
  /**
   * Verifies if a clinic has reached its limit for a specific resource.
   * Throws 402 Payment Required if limit is reached.
   */
  async check(clinicaId: string, recurso: Resource): Promise<void> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
      select: { plano: true },
    });
    
    const limites = await prisma.planoLimite.findUniqueOrThrow({
      where: { plano: clinica.plano },
    });

    if (recurso === 'medicos' && limites.maxMedicos !== -1) {
      const n = await prisma.medico.count({
        where: { clinicaId, ativo: true },
      });
      if (n >= limites.maxMedicos) {
        throw new AppError(
          `Limite do plano ${clinica.plano}: máximo ${limites.maxMedicos} médicos ativos. Faça upgrade para desbloquear mais.`,
          402,
          'PLAN_LIMIT_REACHED'
        );
      }
    }

    if (recurso === 'consultas' && limites.maxConsultasMes !== -1) {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const n = await prisma.agendamento.count({
        where: {
          clinicaId,
          criadoEm: { gte: inicioMes },
        },
      });
      if (n >= limites.maxConsultasMes) {
        throw new AppError(
          `Limite mensal de ${limites.maxConsultasMes} consultas atingido para o plano ${clinica.plano}.`,
          402,
          'PLAN_LIMIT_REACHED'
        );
      }
    }

    if (recurso === 'pacientes' && limites.maxPacientes !== -1) {
      const n = await prisma.paciente.count({
        where: { clinicaId },
      });
      if (n >= limites.maxPacientes) {
        throw new AppError(
          `Limite do plano ${clinica.plano}: máximo ${limites.maxPacientes} pacientes.`,
          402,
          'PLAN_LIMIT_REACHED'
        );
      }
    }
  },

  /**
   * Checks if a feature is available for the given clinic's plan.
   */
  async canUseFeature(
    clinicaId: string,
    feature: Feature,
    params?: { dataInicio?: Date }
  ): Promise<boolean> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
      select: { plano: true },
    });

    const limites = await prisma.planoLimite.findUniqueOrThrow({
      where: { plano: clinica.plano },
    });

    // Handle boolean features directly from DB
    const featureMap: Record<Feature, boolean> = {
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
      throw new AppError(
        `Esta funcionalidade não está incluída no seu plano ${clinica.plano}.`,
        402,
        'PLAN_RESTRICTION'
      );
    }

    return true;
  },
};
