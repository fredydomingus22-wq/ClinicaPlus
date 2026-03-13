import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generatePatientNumber } from './patientNumber.service';
import { AppError } from '../lib/AppError';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { Prisma } from '@prisma/client';
import { UtilizadorDTO, MedicoDTO, PacienteCreateInput } from '@clinicaplus/types';

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

type UtilizadorWithRelations = Prisma.UtilizadorGetPayload<{
  include: { 
    paciente: true; 
    medico: { include: { especialidade: true } }; 
  };
}>;

export const authService = {
  async login(email: string, password: string, clinicaSlug: string): Promise<{ accessToken: string; refreshToken: string; utilizador: UtilizadorDTO }> {
    // 1. Find clinica by slug
    const clinica = await prisma.clinica.findUnique({ where: { slug: clinicaSlug } });
    if (!clinica || !clinica.ativo) {
      throw new AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND');
    }

    // 2. Find user
    const user = await prisma.utilizador.findUnique({
      where: { clinicaId_email: { clinicaId: clinica.id, email } },
      include: {
        paciente: true,
        medico: {
          include: { especialidade: true }
        },
      }
    });
    
    // Login: same message for email wrong and password wrong
    if (!user || !user.ativo) {
      throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // 3. Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // 4. Issue tokens
    return authService._issueTokens(user as UtilizadorWithRelations);
  },

  async loginSuperAdmin(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; utilizador: UtilizadorDTO }> {
    const normalizedEmail = email.trim().toLowerCase();
    
    // 1. Find user by email and role SUPER_ADMIN
    const user = await prisma.utilizador.findFirst({
      where: { email: normalizedEmail, papel: 'SUPER_ADMIN' },
      include: {
        paciente: true,
        medico: {
          include: { especialidade: true }
        },
      }
    });
    
    // Login: same message for email wrong and password wrong
    if (!user || !user.ativo) {
      throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // 2. Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // 3. Issue tokens
    return authService._issueTokens(user as UtilizadorWithRelations);
  },

  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string; utilizador: UtilizadorDTO }> {
    const stored = await prisma.refreshToken.findUnique({ 
      where: { token: rawToken } 
    });

    // Reuse detection: token was already used — revoke all sessions for this user
    if (stored?.usedAt) {
      await prisma.refreshToken.deleteMany({ 
        where: { utilizadorId: stored.utilizadorId } 
      });
      throw new AppError('Token de atualização inválido ou reutilizado', 401, 'TOKEN_REUSE_DETECTED');
    }

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Sessão expirada ou inválida', 401, 'SESSION_EXPIRED');
    }

    // Mark as used (rotation)
    await prisma.refreshToken.update({ 
      where: { id: stored.id }, 
      data: { usedAt: new Date() } 
    });

    const user = await prisma.utilizador.findUniqueOrThrow({ 
      where: { id: stored.utilizadorId },
      include: {
        paciente: true,
        medico: {
          include: { especialidade: true }
        },
      }
    });
    
    if (!user.ativo) {
      throw new AppError('Utilizador inativo', 401, 'USER_INACTIVE');
    }

    return authService._issueTokens(user as UtilizadorWithRelations);
  },

  async logout(rawToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: rawToken } });
  },

  async forgotPassword(email: string, clinicaId: string): Promise<void> {
    const user = await prisma.utilizador.findUnique({
      where: { clinicaId_email: { clinicaId, email } },
    });

    // Don't throw error if email doesn't exist to prevent enumeration
    if (!user || !user.ativo) return;

    const token = jwt.sign(
      { sub: user.id, purpose: 'reset-password' },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // For development/testing: token logging
    logger.info(`[FORGOT_PASSWORD] Token for ${email}: ${token}`);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string, purpose: string };
      if (payload.purpose !== 'reset-password') {
        throw new Error('Token inválido para esta operação');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.utilizador.update({
        where: { id: payload.sub },
        data: { passwordHash },
      });
    } catch {
      throw new AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN');
    }
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.utilizador.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('Utilizador não encontrado', 404, 'USER_NOT_FOUND');
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Palavra-passe atual incorreta', 103, 'INVALID_OLD_PASSWORD'); // Custom code for UI
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.utilizador.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  async registerPaciente(data: Omit<PacienteCreateInput, 'ativo'> & { password?: string, clinicaSlug: string }, clinicaSlug: string): Promise<{ accessToken: string; refreshToken: string; utilizador: UtilizadorDTO }> {
    const clinica = await prisma.clinica.findUnique({ where: { slug: clinicaSlug } });
    if (!clinica || !clinica.ativo) {
      throw new AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND');
    }

    if (!data.email) {
      throw new AppError('O e-mail é obrigatório para registar a conta online.', 400, 'VALIDATION_ERROR');
    }

    if (!data.password) {
      throw new AppError('A palavra-passe é obrigatória.', 400, 'VALIDATION_ERROR');
    }

    // Check existing
    const existing = await prisma.utilizador.findUnique({
      where: { clinicaId_email: { clinicaId: clinica.id, email: data.email } }
    });
    if (existing) {
      throw new AppError('Este e-mail já está registado.', 409, 'DUPLICATE_ENTRY');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const numeroPaciente = await generatePatientNumber(clinica.id);

    const newUser = await prisma.$transaction(async (tx) => {
      const utilizador = await tx.utilizador.create({
        data: {
          clinicaId: clinica.id,
          nome: data.nome,
          email: data.email as string,
          passwordHash: hashedPassword,
          papel: 'PACIENTE',
          paciente: {
            create: {
              clinicaId: clinica.id,
              numeroPaciente,
              nome: data.nome,
              dataNascimento: new Date(data.dataNascimento),
              genero: data.genero,
              tipoSangue: data.tipoSangue ?? null,
              alergias: data.alergias ?? [],
              telefone: data.telefone ?? null,
              email: data.email || null,
              endereco: data.endereco ?? null,
              provincia: data.provincia ?? null,
              seguroSaude: data.seguroSaude ?? false,
              seguradora: data.seguradora ?? null,
              ativo: true,
            }
          }
        },
        include: {
          paciente: true,
          medico: { include: { especialidade: true } }
        }
      });
      return utilizador;
    });

    return this._issueTokens(newUser as UtilizadorWithRelations);
  },

  async _issueTokens(user: UtilizadorWithRelations): Promise<{ accessToken: string; refreshToken: string; utilizador: UtilizadorDTO }> {
    const accessToken = jwt.sign(
      { sub: user.id, clinicaId: user.clinicaId, papel: user.papel },
      config.JWT_SECRET,
      { expiresIn: ACCESS_TTL }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: {
        utilizadorId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { 
      accessToken, 
      refreshToken, 
      utilizador: toUtilizadorDTO(user) 
    };
  },
};

function toUtilizadorDTO(user: UtilizadorWithRelations): UtilizadorDTO {
  const dto: UtilizadorDTO = {
    id: user.id,
    clinicaId: user.clinicaId,
    nome: user.nome,
    email: user.email,
    papel: user.papel as unknown as UtilizadorDTO['papel'],
    ativo: user.ativo,
    criadoEm: user.criadoEm.toISOString(),
    atualizadoEm: user.atualizadoEm.toISOString(),
  };

  if (user.paciente) {
    dto.paciente = {
      id: user.paciente.id,
      clinicaId: user.paciente.clinicaId,
      numeroPaciente: user.paciente.numeroPaciente,
      utilizadorId: user.paciente.utilizadorId || null,
      nome: user.paciente.nome,
      dataNascimento: user.paciente.dataNascimento.toISOString(),
      genero: user.paciente.genero,
      tipoSangue: user.paciente.tipoSangue || null,
      alergias: user.paciente.alergias,
      telefone: user.paciente.telefone || null,
      email: user.paciente.email || null,
      endereco: user.paciente.endereco || null,
      provincia: user.paciente.provincia || null,
      seguroSaude: user.paciente.seguroSaude,
      seguradora: user.paciente.seguradora || null,
      ativo: user.paciente.ativo,
      criadoEm: user.paciente.criadoEm.toISOString(),
      atualizadoEm: user.paciente.atualizadoEm.toISOString(),
    };
  }

  if (user.medico) {
    const medicoDto: MedicoDTO = {
      id: user.medico.id,
      clinicaId: user.medico.clinicaId,
      utilizadorId: user.medico.utilizadorId,
      nome: user.medico.nome,
      especialidadeId: user.medico.especialidadeId,
      ordem: user.medico.ordem || null,
      telefoneDireto: user.medico.telefoneDireto || null,
      horario: user.medico.horario as unknown as MedicoDTO['horario'],
      duracaoConsulta: user.medico.duracaoConsulta,
      preco: user.medico.preco,
      ativo: user.medico.ativo,
      criadoEm: user.medico.criadoEm.toISOString(),
      atualizadoEm: user.medico.atualizadoEm.toISOString(),
    };

    if (user.medico.especialidade) {
      medicoDto.especialidade = {
        id: user.medico.especialidade.id,
        clinicaId: user.medico.especialidade.clinicaId,
        nome: user.medico.especialidade.nome,
        descricao: user.medico.especialidade.descricao,
        ativo: user.medico.especialidade.ativo,
        criadoEm: user.medico.especialidade.criadoEm.toISOString(),
        atualizadoEm: user.medico.especialidade.atualizadoEm.toISOString(),
      };
    }

    dto.medico = medicoDto;
  }

  return dto;
}
