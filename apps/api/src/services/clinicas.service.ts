import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { authService } from './auth.service';
import type { ClinicaCreateInput, ClinicaUpdateInput, ClinicaDTO } from '@clinicaplus/types';
import type { Clinica, ConfiguracaoClinica, ContactoClinica } from '@prisma/client';

/**
 * Maps a Prisma Clinica record to a ClinicaDTO.
 * Never exposes raw DB fields like internal ids beyond what DTO specifies.
 */
function toClinicaDTO(
  c: Clinica, 
  config?: ConfiguracaoClinica | null,
  contactos?: ContactoClinica[]
): ClinicaDTO {
  const dto: ClinicaDTO = {
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    logo: c.logo,
    telefone: c.telefone,
    email: c.email,
    endereco: c.endereco,
    cidade: c.cidade,
    provincia: c.provincia,
    plano: c.plano as ClinicaDTO['plano'],
    ativo: c.ativo,
    criadoEm: c.criadoEm.toISOString(),
    atualizadoEm: c.atualizadoEm.toISOString(),
  };

  if (config) {
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

  if (contactos && contactos.length > 0) {
    dto.contactos = contactos.map(cont => ({
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

// Slug must only contain lowercase letters, numbers and hyphens
const SLUG_REGEX = /^[a-z0-9-]{3,50}$/;

export const clinicasService = {
  /**
   * Registers a new clinic with an ADMIN user and default configuration.
   * Returns the ClinicaDTO and an accessToken for immediate login.
   */
  async registar(data: ClinicaCreateInput): Promise<any> {
    // Validate slug format
    if (!SLUG_REGEX.test(data.slug)) {
      throw new AppError(
        'Slug inválido. Utilize apenas letras minúsculas, números e hífens (3–50 caracteres).',
        400,
        'INVALID_SLUG'
      );
    }

    // Check slug uniqueness (409 if taken)
    const existing = await prisma.clinica.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new AppError('Este slug já está em uso. Escolha outro.', 409, 'SLUG_TAKEN');
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 12);

    // Create Clinica + ADMIN user + ConfiguracaoClinica in one transaction
    const clinica = await prisma.$transaction(async (tx) => {
      const newClinica = await tx.clinica.create({
        data: {
          nome: data.nome,
          slug: data.slug,
          email: data.email,
          logo: data.logo || null,
          telefone: data.telefone || null,
          endereco: data.endereco || null,
          cidade: data.cidade || null,
          provincia: data.provincia || null,
          plano: data.plano,
        },
      });

      await tx.utilizador.create({
        data: {
          clinicaId: newClinica.id,
          nome: data.adminNome,
          email: data.adminEmail,
          passwordHash,
          papel: 'ADMIN',
        },
      });

      // Create default ConfiguracaoClinica
      await tx.configuracaoClinica.create({
        data: {
          clinicaId: newClinica.id,
          lembrete24h: true,
          lembrete2h: true,
          agendamentoOnline: false,
          preTriagem: true,
          prontuarioCustom: false,
          horasAntecedencia: 24,
          moedaSimbolo: 'Kz',
          fusoHorario: 'Africa/Luanda',
        },
      });

      return newClinica;
    });

    // Find the newly created ADMIN user to issue tokens
    const adminUser = await prisma.utilizador.findUniqueOrThrow({
      where: { clinicaId_email: { clinicaId: clinica.id, email: data.adminEmail } },
    });

    const { accessToken, refreshToken } = await authService._issueTokens(adminUser as any);

    const fullClinica = await this.getMe(clinica.id);

    return {
      clinica: fullClinica,
      admin: {
        id: adminUser.id,
        nome: adminUser.nome,
        email: adminUser.email,
        papel: adminUser.papel as any,
      },
      accessToken,
      refreshToken,
    };
  },

  /**
   * Checks if a slug is available for registration.
   */
  async verificarSlug(slug: string): Promise<{ disponivel: boolean }> {
    if (!SLUG_REGEX.test(slug)) {
      return { disponivel: false };
    }
    const existing = await prisma.clinica.findUnique({ where: { slug } });
    return { disponivel: !existing };
  },

  /**
   * Returns the ClinicaDTO for the given clinicaId (used for ADMIN's "me" endpoint).
   */
  async getMe(clinicaId: string): Promise<ClinicaDTO> {
    const clinica = await prisma.clinica.findUnique({
      where: { id: clinicaId },
      include: { 
        configuracao: true,
        contactos: { orderBy: { ordem: 'asc' } }
      },
    });
    if (!clinica) {
      throw new AppError('Clínica não encontrada', 404, 'NOT_FOUND');
    }
    return toClinicaDTO(clinica, clinica.configuracao, clinica.contactos);
  },

  /**
   * Updates editable fields of the clinic. Slug and plano cannot be changed here.
   */
  async update(clinicaId: string, data: ClinicaUpdateInput): Promise<ClinicaDTO> {
    // Prevent changing slug or plano via this endpoint
    const { configuracao, ...safeData } = data;

    const clinica = await prisma.clinica.update({
      where: { id: clinicaId },
      data: {
        ...safeData,
        configuracao: configuracao ? {
          upsert: {
            create: configuracao as any,
            update: configuracao as any
          }
        } : undefined
      } as any,
      include: { 
        configuracao: true,
        contactos: { orderBy: { ordem: 'asc' } }
      },
    });

    return toClinicaDTO(clinica, clinica.configuracao, clinica.contactos);
  },

  /**
   * Adds a new contact or updates all if a full list is provided.
   * For simplicity, let's allow a full list update or single operations.
   */
  async updateContactos(clinicaId: string, contactos: any[]): Promise<ClinicaDTO> {
    await prisma.$transaction(async (tx) => {
      // Delete all and recreate to ensure order and consistency
      await tx.contactoClinica.deleteMany({ where: { clinicaId } });
      await tx.contactoClinica.createMany({
        data: contactos.map((c, index) => ({
          clinicaId,
          tipo: c.tipo,
          valor: c.valor,
          descricao: c.descricao || null,
          ordem: c.ordem ?? index,
        }))
      });
    });

    return this.getMe(clinicaId);
  },
};
