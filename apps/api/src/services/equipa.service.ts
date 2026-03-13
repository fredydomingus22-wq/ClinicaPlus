import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/AppError';
import { logger } from '../lib/logger';
import { generateInitialPassword } from '@clinicaplus/utils';
import { notificationService } from './notification.service';
import { Prisma } from '@prisma/client';
import type { 
  EquipaCreateInput, 
  UtilizadorUpdateInput, 
  UtilizadorListQuery,
  PaginatedResult,
  UtilizadorDTO
} from '@clinicaplus/types';
import type { Utilizador } from '@prisma/client';

/**
 * Maps a Prisma Utilizador to a UtilizadorDTO.
 */
function toUtilizadorDTO(u: Utilizador): UtilizadorDTO {
  return {
    id: u.id,
    clinicaId: u.clinicaId,
    nome: u.nome,
    email: u.email,
    papel: u.papel as UtilizadorDTO['papel'],
    ativo: u.ativo,
    criadoEm: u.criadoEm.toISOString(),
    atualizadoEm: u.atualizadoEm.toISOString(),
  };
}

export const equipaService = {
  /**
   * Lists staff users (excluding patients, maybe focusing on ADMIN and RECEPCIONISTA).
   */
  async list(clinicaId: string, query: UtilizadorListQuery): Promise<PaginatedResult<UtilizadorDTO>> {
    const { papel, ativo, q, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UtilizadorWhereInput = {
      clinicaId,
      // Default to non-patient roles if role not specified
      papel: papel || { not: 'PACIENTE' },
      ...(ativo !== undefined && { ativo }),
    };

    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, utilizadores] = await Promise.all([
      prisma.utilizador.count({ where }),
      prisma.utilizador.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: utilizadores.map(toUtilizadorDTO),
      total,
      page,
      limit,
    };
  },

  /**
   * Returns a single staff user.
   */
  async getOne(id: string, clinicaId: string): Promise<UtilizadorDTO> {
    const u = await prisma.utilizador.findUnique({ where: { id } });
    if (!u || u.clinicaId !== clinicaId) {
      throw new AppError('Utilizador não encontrado', 404, 'NOT_FOUND');
    }
    return toUtilizadorDTO(u);
  },

  /**
   * Creates a new staff user (e.g., RECEPCIONISTA, ADMIN), generates a password,
   * configures the account, and sends a welcome email.
   */
  async create(data: EquipaCreateInput, clinicaId: string): Promise<UtilizadorDTO> {
    // Check if email already exists for this clinic
    const existingUser = await prisma.utilizador.findUnique({
      where: {
        clinicaId_email: { clinicaId, email: data.email }
      }
    });

    if (existingUser) {
      throw new AppError('Este email já está registado.', 409, 'DUPLICATE_ENTRY');
    }

    // Role validation: Do not allow MEDICO or PACIENTE through this endpoint.
    // Medicos have special data (specialties, horarios), Patients have their own forms.
    // Role validation: Do not allow PACIENTE through this endpoint.
    if (data.papel === 'PACIENTE') {
      throw new AppError('Este endpoint não suporta a criação de Pacientes.', 400, 'INVALID_ROLE');
    }

    const clearPassword = generateInitialPassword(10);
    const hashedPassword = await bcrypt.hash(clearPassword, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.utilizador.create({
        data: {
          clinicaId,
          nome: data.nome,
          email: data.email,
          passwordHash: hashedPassword,
          papel: data.papel,
          ativo: data.ativo ?? true,
        }
      });

      // Synchronize Medico record if role is MEDICO
      if (u.papel === 'MEDICO') {
        let esp = await tx.especialidade.findFirst({ where: { clinicaId } });
        if (!esp) {
          esp = await tx.especialidade.create({
            data: { clinicaId, nome: 'Clínica Geral', descricao: 'Criada automaticamente (Sistema)' }
          });
        }

        await tx.medico.create({
          data: {
            clinicaId,
            utilizadorId: u.id,
            nome: u.nome,
            especialidadeId: esp.id,
            horario: {
              "1": { ativo: true, inicio: "08:00", fim: "17:00" },
              "2": { ativo: true, inicio: "08:00", fim: "17:00" },
              "3": { ativo: true, inicio: "08:00", fim: "17:00" },
              "4": { ativo: true, inicio: "08:00", fim: "17:00" },
              "5": { ativo: true, inicio: "08:00", fim: "17:00" }
            }
          }
        });
      }

      return u;
    });

    // Send welcome email (fire-and-forget)
    const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId } });
    notificationService.sendStaffWelcomeEmail({
      email: newUser.email,
      nome: newUser.nome,
      clearPassword,
      papel: newUser.papel,
      clinicaNome: clinica?.nome || '',
    }).catch(err => {
      logger.error({ err }, 'Failed to send welcome email to new staff');
    });

    return toUtilizadorDTO(newUser);
  },

  /**
   * Updates editable fields for a staff user.
   */
  async update(id: string, data: UtilizadorUpdateInput, clinicaId: string): Promise<UtilizadorDTO> {
    const existing = await prisma.utilizador.findUnique({ where: { id } });
    if (!existing || existing.clinicaId !== clinicaId) {
      throw new AppError('Utilizador não encontrado', 404, 'NOT_FOUND');
    }

    // Prevent changing role to MEDICO or PACIENTE here
    // Prevent changing role to PACIENTE here
    if (data.papel === 'PACIENTE') {
      throw new AppError('Não é possível alterar o papel para Paciente por este meio.', 400, 'INVALID_ROLE');
    }

    const updateData: Parameters<typeof prisma.utilizador.update>[0]['data'] = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.papel !== undefined) updateData.papel = data.papel;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;

    const u = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.utilizador.update({
        where: { id },
        data: updateData,
      });

      // Synchronize Medico record if role is now MEDICO
      if (updatedUser.papel === 'MEDICO') {
        const existingMedico = await tx.medico.findUnique({ where: { utilizadorId: id } });
        if (!existingMedico) {
          let esp = await tx.especialidade.findFirst({ where: { clinicaId } });
          if (!esp) {
            esp = await tx.especialidade.create({
              data: { clinicaId, nome: 'Clínica Geral', descricao: 'Criada automaticamente (Sistema)' }
            });
          }

          await tx.medico.create({
            data: {
              clinicaId,
              utilizadorId: updatedUser.id,
              nome: updatedUser.nome,
              especialidadeId: esp.id,
              horario: {
                "1": { ativo: true, inicio: "08:00", fim: "17:00" },
                "2": { ativo: true, inicio: "08:00", fim: "17:00" },
                "3": { ativo: true, inicio: "08:00", fim: "17:00" },
                "4": { ativo: true, inicio: "08:00", fim: "17:00" },
                "5": { ativo: true, inicio: "08:00", fim: "17:00" }
              }
            }
          });
        }
      }

      return updatedUser;
    });

    return toUtilizadorDTO(u);
  },
};
