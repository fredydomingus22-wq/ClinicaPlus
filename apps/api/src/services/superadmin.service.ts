import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { ClinicaListQuery, ClinicaDTO, Plano as SharedPlano, Papel as SharedPapel, ClinicaCreateInput, SystemLogDTO, GlobalSettingsDTO, PaginatedResult } from '@clinicaplus/types';
import { Prisma, Plano, Papel } from '@prisma/client';
import { clinicasService } from './clinicas.service';
import { notificationService } from './notification.service';
import { notificacoesService } from './notificacoes.service';
import { logger } from '../lib/logger';

type ClinicaPayload = Prisma.ClinicaGetPayload<{
  include: { configuracao: true; contactos: true };
}>;

/**
 * Maps a Prisma Clinica record to a ClinicaDTO.
 */
function toClinicaDTO(c: ClinicaPayload | Prisma.ClinicaGetPayload<Record<string, never>>): ClinicaDTO {
  const dto: ClinicaDTO = {
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    logo: c.logo || null,
    telefone: c.telefone || null,
    email: c.email as string,
    endereco: c.endereco || null,
    cidade: c.cidade || null,
    provincia: c.provincia || null,
    plano: c.plano as unknown as SharedPlano,
    ativo: c.ativo,
    criadoEm: c.criadoEm.toISOString(),
    atualizadoEm: c.atualizadoEm.toISOString(),
  };

  if ('configuracao' in c && c.configuracao) {
    const config = c.configuracao as NonNullable<ClinicaPayload['configuracao']>;
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
    };
  }

  if ('contactos' in c && c.contactos) {
    dto.contactos = c.contactos.map((cont: Prisma.ContactoClinicaGetPayload<Record<string, never>>) => ({
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

export const superAdminService = {
  /**
   * Lists all clinics across the system.
   * cross-tenant: bypasses normal clinic isolation.
   */
  async listClinicas(query: ClinicaListQuery): Promise<{ items: ClinicaDTO[]; total: number; page: number; limit: number }> {
    const { q, plano, ativo, page = 1, limit = 20 } = query;

    const where: Prisma.ClinicaWhereInput = {};

    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (plano) {
      where.plano = plano as Plano;
    }

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    // superadmin: cross-tenant query
    const [items, total] = await prisma.$transaction([
      prisma.clinica.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.clinica.count({ where }),
    ]);

    return {
      items: items.map(toClinicaDTO),
      total,
      page,
      limit,
    };
  },

  /**
   * Gets details of a specific clinic by ID.
   * cross-tenant: bypasses normal clinic isolation.
   */
  async getClinica(id: string): Promise<ClinicaDTO> {
    // superadmin: cross-tenant query
    const clinica = await prisma.clinica.findUnique({
      where: { id },
    });

    if (!clinica) {
      throw new AppError('Clínica não encontrada', 404, 'NOT_FOUND');
    }

    return toClinicaDTO(clinica);
  },

  /**
   * Updates clinic plan or active status.
   * cross-tenant: bypasses normal clinic isolation.
   */
  async updateClinica(id: string, data: { plano?: string; ativo?: boolean | undefined }): Promise<ClinicaDTO> {
    // superadmin: cross-tenant query
    const clinica = await prisma.clinica.update({
      where: { id },
      data: {
        ...(data.plano && { plano: data.plano as Plano }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
    });

    return toClinicaDTO(clinica);
  },

  /**
   * Returns global system statistics.
   * cross-tenant: aggregating data from all tenants.
   */
  async getGlobalStats(): Promise<{ 
    totalClinicas: number; 
    totalUtilizadores: number; 
    totalAgendamentos: number;
    totalRevenue: number;
  }> {
    // superadmin: cross-tenant queries
    const [totalClinicas, totalUtilizadores, totalAgendamentos, activeClinicas] = await prisma.$transaction([
      prisma.clinica.count(),
      prisma.utilizador.count(),
      prisma.agendamento.count(),
      prisma.clinica.findMany({
        where: { ativo: true },
        select: { plano: true }
      })
    ]);

    // Pricing logic per plan (Monthly subscription)
    const planPrices: Record<string, number> = {
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

  /**
   * Provisions a new tenant with an initial admin user and default settings.
   */
  async provisionClinic(data: ClinicaCreateInput, requestedBy: string): Promise<ClinicaDTO> {
    // 1. Check if global registration is allowed
    const settings = await this.getGlobalSettings();
    if (!settings.registoNovasClinicas) {
      throw new AppError('O registo de novas clínicas está temporariamente desativado.', 403, 'REGISTRATION_DISABLED');
    }

    // 2. Delegate to existing clinicasService for transactional creation
    const result = await clinicasService.registar(data);

    // 3. Trigger asynchronous notifications (non-blocking)
    const { clinica, admin } = result as any; // Cast because of DTO vs internal user type
    
    // Notification Service (Emails)
    notificationService.sendClinicaWelcomeEmail({
      email: clinica.email,
      nome: clinica.nome,
      plano: clinica.plano
    }).catch((err: Error) => logger.error({ err }, 'Async error: Clinica welcome email'));

    notificationService.sendAdminWelcomeEmail({
      email: admin.email,
      nome: admin.nome,
      senhaTemporaria: data.adminPassword,
      clinicaNome: clinica.nome
    }).catch((err: Error) => logger.error({ err }, 'Async error: Admin welcome email'));

    // System Notification (Web UI)
    notificacoesService.create({
      utilizadorId: admin.id,
      titulo: 'Bem-vindo à ClinicaPlus',
      mensagem: `Olá ${admin.nome}, a sua conta administrativa para a clínica ${clinica.nome} está pronta. Recomendamos que explore as configurações e configure a sua equipa.`,
      tipo: 'SUCESSO',
      url: '/configuracoes'
    }).catch((err: Error) => logger.error({ err }, 'Async error: Admin initial notification'));

    // 4. Log the system action
    await prisma.systemLog.create({
      data: {
        nivel: 'INFO',
        mensagem: `Nova clínica provisionada: ${data.nome} (${data.slug})`,
        acao: 'TENANT_PROVISIONING',
        utilizadorId: requestedBy,
        detalhes: {
          clinicaId: result.clinica.id,
          plano: data.plano,
          adminEmail: data.adminEmail
        }
      }
    });

    return result.clinica;
  },

  /**
   * Lists all users across the system.
   * cross-tenant: bypasses normal isolation.
   */
  async listUsers(query: Record<string, string | undefined>): Promise<PaginatedResult<{
    id: string;
    nome: string;
    email: string;
    papel: SharedPapel;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
    clinicaId: string;
    clinicaNome: string;
  }>> {
    const { q, papel, ativo, clinicaId, page = 1, limit = 20 } = query;

    const where: Prisma.UtilizadorWhereInput = {};

    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (papel) where.papel = papel as Papel;
    if (ativo !== undefined) where.ativo = String(ativo) === 'true';
    if (clinicaId) where.clinicaId = clinicaId;

    const [items, total] = await prisma.$transaction([
      prisma.utilizador.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { criadoEm: 'desc' },
        include: { clinica: { select: { nome: true } } }
      }),
      prisma.utilizador.count({ where }),
    ]);

    return {
      items: items.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        papel: u.papel as unknown as SharedPapel,
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

  /**
   * Updates a user's active status globally
   */
  async updateUserStatus(id: string, ativo: boolean): Promise<{
    id: string;
    nome: string;
    email: string;
    papel: SharedPapel;
    ativo: boolean;
    clinicaId: string;
    criadoEm: string;
    clinicaNome: string;
  }> {
    const user = await prisma.utilizador.update({
      where: { id },
      data: { ativo },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        ativo: true,
        clinicaId: true,
        criadoEm: true,
        clinica: { select: { nome: true } }
      }
    });
    
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      papel: user.papel as unknown as SharedPapel,
      ativo: user.ativo,
      clinicaId: user.clinicaId,
      criadoEm: user.criadoEm.toISOString(),
      clinicaNome: user.clinica?.nome || 'Sistema',
    };
  },

  /**
   * Retrieves global system logs
   */
  async listLogs(query: Record<string, string | undefined>): Promise<PaginatedResult<SystemLogDTO>> {
    const { q, nivel, page = '1', limit = '50' } = query;

    const where: Prisma.SystemLogWhereInput = {};
    if (q) {
      where.OR = [
        { mensagem: { contains: q, mode: 'insensitive' } },
        { acao: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (nivel) where.nivel = nivel;

    const [items, total] = await prisma.$transaction([
      prisma.systemLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { criadoEm: 'desc' },
        include: { utilizador: { select: { nome: true, email: true } } }
      }),
      prisma.systemLog.count({ where }),
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

  /**
   * Retrieves global system settings
   */
  async getGlobalSettings(): Promise<GlobalSettingsDTO> {
    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'global_settings' }
    });

    if (!settings) {
      const created = await prisma.globalSettings.create({
        data: { id: 'global_settings' }
      });
      return {
        ...created,
        atualizadoEm: created.atualizadoEm.toISOString()
      };
    }

    return {
      ...settings,
      atualizadoEm: settings.atualizadoEm.toISOString()
    };
  },

  async updateGlobalSettings(data: {
    modoManutencao?: boolean | undefined;
    registoNovasClinicas?: boolean | undefined;
    maxUploadSizeMb?: number | undefined;
    mensagemSistema?: string | null | undefined;
  }): Promise<GlobalSettingsDTO> {
    const updatePayload: Prisma.GlobalSettingsUpdateInput = {};
    if (data.modoManutencao !== undefined) updatePayload.modoManutencao = data.modoManutencao;
    if (data.registoNovasClinicas !== undefined) updatePayload.registoNovasClinicas = data.registoNovasClinicas;
    if (data.maxUploadSizeMb !== undefined) updatePayload.maxUploadSizeMb = data.maxUploadSizeMb;
    if (data.mensagemSistema !== undefined) updatePayload.mensagemSistema = data.mensagemSistema;

    const settings = await prisma.globalSettings.upsert({
      where: { id: 'global_settings' },
      update: updatePayload,
      create: {
        id: 'global_settings',
        modoManutencao: data.modoManutencao ?? false,
        registoNovasClinicas: data.registoNovasClinicas ?? true,
        maxUploadSizeMb: data.maxUploadSizeMb ?? 5,
        mensagemSistema: data.mensagemSistema ?? null,
      }
    });

    return {
      ...settings,
      atualizadoEm: settings.atualizadoEm.toISOString()
    };
  }
};
