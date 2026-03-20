
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { notificationService } from './notification.service';
import { addMonths, startOfMonth, differenceInCalendarDays, addDays } from 'date-fns';
import { Plano, EstadoSubscricao, RazaoMudancaPlano } from '@clinicaplus/types';

export const subscricaoService = {

  /**
   * Creates a new immutable subscription record and updates the clinic cache.
   * This is the only way to change a clinic's plan or subscription state.
   */
  async criarNovaSubscricao(input: {
    clinicaId: string;
    plano: Plano;
    estado: EstadoSubscricao;
    validaAte?: Date;
    valorKz?: number | null;
    referenciaInterna?: string | null;
    razao: RazaoMudancaPlano;
    alteradoPor: string;
    notas?: string | null;
  }): Promise<import('@prisma/client').Subscricao> {
    const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: input.clinicaId } });

    return prisma.$transaction(async (tx) => {
      // 1. Create new immutable record
      const subscricao = await tx.subscricao.create({
        data: {
          clinicaId: input.clinicaId,
          plano:     input.plano,
          estado:    input.estado,
          inicioEm:  new Date(),
          validaAte: input.validaAte ?? addMonths(new Date(), 1),
          valorKz:   input.valorKz ?? null,
          referenciaInterna: input.referenciaInterna ?? null,
          razao:     input.razao,
          planoAnterior: clinica.plano,
          alteradoPor: input.alteradoPor,
          notas:     input.notas ?? null,
        },
      });

      // 2. Update cache on Clinica (atomic transaction)
      await tx.clinica.update({
        where: { id: input.clinicaId },
        data: {
          plano:               input.plano,
          subscricaoEstado:    input.estado,
          subscricaoValidaAte: subscricao.validaAte,
        },
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          clinicaId:   input.clinicaId,
          actorId:     input.alteradoPor,
          actorTipo:   input.alteradoPor === 'sistema' ? 'SISTEMA' : 'UTILIZADOR',
          accao:       'SUBSCRICAO_ALTERADA',
          recurso:     'subscricao',
          recursoId:   subscricao.id,
          metadata: {
            planoAnterior: clinica.plano,
            planoNovo:     input.plano,
            razao:         input.razao,
          },
        },
      });

      return subscricao;
    });
  },

  /**
   * Returns the subscription history for a clinic, ordered by creation date descending.
   */
  async historico(clinicaId: string): Promise<import('@prisma/client').Subscricao[]> {
    return prisma.subscricao.findMany({
      where: { clinicaId },
      orderBy: { criadoEm: 'desc' },
    });
  },

  /**
   * Suspends a clinic's subscription, performing an automatic downgrade to BASIC.
   */
  async suspender(clinicaId: string): Promise<void> {
    await this.criarNovaSubscricao({
      clinicaId,
      plano:   Plano.BASICO,
      estado:  EstadoSubscricao.SUSPENSA,
      razao:   RazaoMudancaPlano.DOWNGRADE_AUTO,
      alteradoPor: 'sistema',
      notas:   'Suspensão automática por falta de pagamento após grace period',
    });
    
    // Notify clinic admin via email
    await notificationService.enviarEmailContaSuspensa(clinicaId);
  },

  /**
   * Verifies if a clinic has reached its limit for a specific resource.
   * Throws AppError with PLAN_LIMIT_REACHED if limit exceeded.
   */
  async verificarLimite(clinicaId: string, recurso: 'medicos' | 'consultas' | 'pacientes' | 'apikeys'): Promise<void> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
    });

    const limites = await prisma.planoLimite.findUniqueOrThrow({ 
      where: { plano: clinica.plano } 
    });

    const contagens = {
      medicos:    (): Promise<number> => prisma.medico.count({ where: { clinicaId, ativo: true } }),
      consultas:  (): Promise<number> => prisma.agendamento.count({
        where: { 
          clinicaId, 
          dataHora: { gte: startOfMonth(new Date()) } 
        }
      }),
      pacientes:  (): Promise<number> => prisma.paciente.count({ where: { clinicaId } }),
      apikeys:    (): Promise<number> => prisma.apiKey.count({ where: { clinicaId, ativo: true } }),
    };

    const limiteCampo = {
      medicos:   'maxMedicos',
      consultas: 'maxConsultasMes',
      pacientes: 'maxPacientes',
      apikeys:   'maxApiKeys',
    } as const;

    const limiteValue = limites[limiteCampo[recurso]] as number;
    
    // -1 means unlimited
    if (limiteValue === -1) return; 

    const actual = await (contagens[recurso])() as number;
    
    if (actual >= limiteValue) {
      throw new AppError(
        `Limite do plano ${clinica.plano}: máximo ${limiteValue} ${recurso}.`,
        402,
        'PLAN_LIMIT_REACHED',
        { recurso, limite: limiteValue, actual, plano: clinica.plano }
      );
    }
  },

  /**
   * Returns current subscription status, limits, and features.
   */
  async getActual(clinicaId: string): Promise<{
    plano: Plano;
    estado: EstadoSubscricao;
    validaAte: Date | null;
    diasRestantes: number;
    emGracePeriod: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    limites: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    features: any;
  }> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
    });

    const uso = await this.getUso(clinicaId);
    
    const validaAte = clinica.subscricaoValidaAte ? new Date(clinica.subscricaoValidaAte) : null;
    
    const diasRestantes = validaAte 
      ? Math.max(0, differenceInCalendarDays(validaAte, new Date()))
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
      plano: clinica.plano as Plano,
      estado: clinica.subscricaoEstado as EstadoSubscricao,
      validaAte: clinica.subscricaoValidaAte,
      diasRestantes,
      emGracePeriod: clinica.subscricaoEstado === EstadoSubscricao.GRACE_PERIOD,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      limites: uso as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features: features as any,
    };
  },

  /**
   * Returns current usage vs limits for all critical resources.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getUso(clinicaId: string): Promise<any> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
    });

    const limites = await prisma.planoLimite.findUniqueOrThrow({ 
      where: { plano: clinica.plano } 
    });

    const [medicos, consultas, pacientes, apiKeys] = await Promise.all([
      prisma.medico.count({ where: { clinicaId, ativo: true } }),
      prisma.agendamento.count({
        where: { clinicaId, dataHora: { gte: startOfMonth(new Date()) } }
      }),
      prisma.paciente.count({ where: { clinicaId } }),
      prisma.apiKey.count({ where: { clinicaId, ativo: true } }),
    ]);

    const formatLimit = (actual: number, maximo: number): { maximo: number; actual: number; percentagem: number | null } => ({
      maximo,
      actual,
      percentagem: maximo === -1 ? null : Math.round((actual / maximo) * 100),
    });

    return {
      medicos:   formatLimit(medicos, limites.maxMedicos),
      consultas: formatLimit(consultas, limites.maxConsultasMes),
      pacientes: formatLimit(pacientes, limites.maxPacientes),
      apiKeys:   formatLimit(apiKeys, limites.maxApiKeys),
    };
  },

  /**
   * Returns clinics with subscriptions expiring in the next 30 days.
   */
  async getExpiringSoon(): Promise<Partial<import('@prisma/client').Clinica>[]> {
    const dataLimite = addDays(new Date(), 30);
    return prisma.clinica.findMany({
      where: {
        AND: [
          { subscricaoValidaAte: { lte: dataLimite } },
          { subscricaoValidaAte: { gte: new Date() } },
          { subscricaoEstado: { in: [EstadoSubscricao.ACTIVA, EstadoSubscricao.TRIAL, EstadoSubscricao.GRACE_PERIOD] } },
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
