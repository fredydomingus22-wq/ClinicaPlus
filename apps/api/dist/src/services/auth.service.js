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
exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const patientNumber_service_1 = require("./patientNumber.service");
const AppError_1 = require("../lib/AppError");
const config_1 = require("../lib/config");
const logger_1 = require("../lib/logger");
const auditLog_service_1 = require("./auditLog.service");
const mfa_service_1 = require("./mfa.service");
const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
exports.authService = {
    async login(email, password, clinicaSlug, ip) {
        // 1. Find clinica by slug
        const clinica = await prisma_1.prisma.clinica.findUnique({ where: { slug: clinicaSlug } });
        if (!clinica || !clinica.ativo) {
            throw new AppError_1.AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND');
        }
        // 2. Find user
        const user = await prisma_1.prisma.utilizador.findUnique({
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
            throw new AppError_1.AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
        }
        // 3. Verify password
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            await auditLog_service_1.auditLogService.log({
                actorId: user.id,
                clinicaId: clinica.id,
                accao: 'FAILED_LOGIN',
                recurso: 'auth',
                ip: ip ?? null,
                metadata: { email, reason: 'Invalid password' }
            });
            throw new AppError_1.AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
        }
        // 4. Issue tokens
        const result = await exports.authService._issueTokens(user);
        await auditLog_service_1.auditLogService.log({
            actorId: user.id,
            clinicaId: clinica.id,
            accao: 'LOGIN',
            recurso: 'auth',
            ip: ip ?? null,
        });
        return result;
    },
    async loginSuperAdmin(email, password, ip, mfaToken) {
        const normalizedEmail = email.trim().toLowerCase();
        // 1. Find user by email and role SUPER_ADMIN
        const user = await prisma_1.prisma.utilizador.findFirst({
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
            throw new AppError_1.AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
        }
        // 2. Verify password
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            await auditLog_service_1.auditLogService.log({
                actorId: user.id,
                clinicaId: user.clinicaId || 'SYSTEM',
                accao: 'FAILED_LOGIN',
                recurso: 'auth',
                ip: ip ?? null,
                metadata: { email, reason: 'Invalid password (SuperAdmin)' }
            });
            throw new AppError_1.AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
        }
        // 3. MFA Check
        if (user.mfaActivatedAt === null) {
            // Retorna token temporário para setup
            const setupToken = jsonwebtoken_1.default.sign({ sub: user.id, intent: 'mfa_setup' }, config_1.config.JWT_SECRET, { expiresIn: '15m' });
            return { requiresMfaSetup: true, setupToken };
        }
        if (user.mfaActivatedAt !== null && !mfaToken) {
            return { requiresMfa: true };
        }
        if (mfaToken) {
            const isValid = await mfa_service_1.mfaService.verify(user.id, mfaToken);
            if (!isValid)
                throw new AppError_1.AppError('Código MFA inválido', 401, 'INVALID_MFA_TOKEN');
        }
        // 4. Issue tokens with 4h TTL for super admin
        const result = await exports.authService._issueTokens(user, { expiresIn: '4h' });
        await auditLog_service_1.auditLogService.log({
            actorId: user.id,
            clinicaId: user.clinicaId || 'SYSTEM',
            accao: 'LOGIN',
            recurso: 'auth',
            ip: ip ?? null,
        });
        return result;
    },
    async refresh(rawToken) {
        const stored = await prisma_1.prisma.refreshToken.findUnique({
            where: { token: rawToken }
        });
        // Reuse detection: token was already used — revoke all sessions for this user
        if (stored?.usedAt) {
            await prisma_1.prisma.refreshToken.deleteMany({
                where: { utilizadorId: stored.utilizadorId }
            });
            throw new AppError_1.AppError('Token de atualização inválido ou reutilizado', 401, 'TOKEN_REUSE_DETECTED');
        }
        if (!stored || stored.expiresAt < new Date()) {
            throw new AppError_1.AppError('Sessão expirada ou inválida', 401, 'SESSION_EXPIRED');
        }
        // Mark as used (rotation)
        await prisma_1.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { usedAt: new Date() }
        });
        const user = await prisma_1.prisma.utilizador.findUniqueOrThrow({
            where: { id: stored.utilizadorId },
            include: {
                paciente: true,
                medico: {
                    include: { especialidade: true }
                },
            }
        });
        if (!user.ativo) {
            throw new AppError_1.AppError('Utilizador inativo', 401, 'USER_INACTIVE');
        }
        return exports.authService._issueTokens(user);
    },
    async logout(rawToken) {
        await prisma_1.prisma.refreshToken.deleteMany({ where: { token: rawToken } });
    },
    async forgotPassword(email, clinicaId) {
        const user = await prisma_1.prisma.utilizador.findUnique({
            where: { clinicaId_email: { clinicaId, email } },
        });
        // Don't throw error if email doesn't exist to prevent enumeration
        if (!user || !user.ativo) {
            logger_1.logger.info({ email, clinicaId }, 'Forgot password requested for non-existent or inactive user');
            return;
        }
        const token = jsonwebtoken_1.default.sign({ sub: user.id, purpose: 'reset-password' }, config_1.config.JWT_SECRET, { expiresIn: '15m' });
        const resetUrl = `${config_1.config.FRONTEND_URL}/reset-password?token=${token}`;
        try {
            // Import notificationService dynamically to avoid circular dependencies if any
            const { notificationService } = await Promise.resolve().then(() => __importStar(require('./notification.service')));
            await notificationService.sendResetPassword({
                email: user.email,
                nome: user.nome,
                resetUrl,
                expiresInMinutes: 15
            });
            logger_1.logger.info({ email: user.email }, 'Reset password email sent');
        }
        catch (err) {
            logger_1.logger.error({ err, email: user.email }, 'Failed to send reset password email');
            // We still log the token in dev in case email fails or for quick testing
            if (config_1.config.NODE_ENV === 'development') {
                logger_1.logger.info(`[FORGOT_PASSWORD] Token for ${email}: ${token}`);
            }
        }
    },
    async resetPassword(token, newPassword) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
            if (payload.purpose !== 'reset-password') {
                throw new Error('Token inválido para esta operação');
            }
            const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
            await prisma_1.prisma.utilizador.update({
                where: { id: payload.sub },
                data: { passwordHash },
            });
        }
        catch {
            throw new AppError_1.AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN');
        }
    },
    async changePassword(userId, oldPassword, newPassword) {
        const user = await prisma_1.prisma.utilizador.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError_1.AppError('Utilizador não encontrado', 404, 'USER_NOT_FOUND');
        }
        const valid = await bcryptjs_1.default.compare(oldPassword, user.passwordHash);
        if (!valid) {
            throw new AppError_1.AppError('Palavra-passe atual incorreta', 103, 'INVALID_OLD_PASSWORD'); // Custom code for UI
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.utilizador.update({
            where: { id: userId },
            data: { passwordHash },
        });
    },
    async updateProfile(userId, data) {
        const user = await prisma_1.prisma.utilizador.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError_1.AppError('Utilizador não encontrado', 404, 'USER_NOT_FOUND');
        }
        const updateData = {};
        if (data.nome && data.nome !== user.nome) {
            updateData.nome = data.nome;
        }
        // Check email uniqueness if changing
        if (data.email && data.email !== user.email) {
            const where = {
                email: data.email
            };
            if (user.clinicaId) {
                where.clinicaId = user.clinicaId;
            }
            else {
                where.clinicaId = null;
            }
            const existing = await prisma_1.prisma.utilizador.findFirst({
                where
            });
            if (existing) {
                throw new AppError_1.AppError('Este e-mail já está a ser utilizado nesta clínica.', 409, 'DUPLICATE_ENTRY');
            }
            updateData.email = data.email;
        }
        // If no changes, just return the current state
        if (Object.keys(updateData).length === 0) {
            const current = await prisma_1.prisma.utilizador.findUniqueOrThrow({
                where: { id: userId },
                include: {
                    paciente: true,
                    medico: { include: { especialidade: true } }
                }
            });
            return toUtilizadorDTO(current);
        }
        const updated = await prisma_1.prisma.utilizador.update({
            where: { id: userId },
            data: updateData,
            include: {
                paciente: true,
                medico: { include: { especialidade: true } }
            }
        });
        return toUtilizadorDTO(updated);
    },
    async registerPaciente(data, clinicaSlug) {
        const clinica = await prisma_1.prisma.clinica.findUnique({ where: { slug: clinicaSlug } });
        if (!clinica || !clinica.ativo) {
            throw new AppError_1.AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND');
        }
        if (!data.email) {
            throw new AppError_1.AppError('O e-mail é obrigatório para registar a conta online.', 400, 'VALIDATION_ERROR');
        }
        if (!data.password) {
            throw new AppError_1.AppError('A palavra-passe é obrigatória.', 400, 'VALIDATION_ERROR');
        }
        // Check existing
        const existing = await prisma_1.prisma.utilizador.findUnique({
            where: { clinicaId_email: { clinicaId: clinica.id, email: data.email } }
        });
        if (existing) {
            throw new AppError_1.AppError('Este e-mail já está registado.', 409, 'DUPLICATE_ENTRY');
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const numeroPaciente = await (0, patientNumber_service_1.generatePatientNumber)(clinica.id);
        const newUser = await prisma_1.prisma.$transaction(async (tx) => {
            const utilizador = await tx.utilizador.create({
                data: {
                    clinicaId: clinica.id,
                    nome: data.nome,
                    email: data.email,
                    passwordHash: hashedPassword,
                    papel: 'PACIENTE',
                    paciente: {
                        create: {
                            clinicaId: clinica.id,
                            numeroPaciente,
                            nome: data.nome,
                            dataNascimento: new Date(data.dataNascimento),
                            genero: data.genero,
                            nif: data.nif,
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
        return this._issueTokens(newUser);
    },
    async _issueTokens(user, options) {
        const accessToken = jsonwebtoken_1.default.sign({ sub: user.id, clinicaId: user.clinicaId, papel: user.papel }, config_1.config.JWT_SECRET, { expiresIn: options?.expiresIn || ACCESS_TTL });
        const refreshToken = crypto_1.default.randomBytes(64).toString('hex');
        await prisma_1.prisma.refreshToken.create({
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
function toUtilizadorDTO(user) {
    const dto = {
        id: user.id,
        clinicaId: user.clinicaId,
        nome: user.nome,
        email: user.email,
        avatarUrl: user.avatarUrl,
        papel: user.papel,
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
            avatarUrl: user.paciente.avatarUrl,
            dataNascimento: user.paciente.dataNascimento.toISOString(),
            genero: user.paciente.genero,
            tipoSangue: user.paciente.tipoSangue || null,
            alergias: user.paciente.alergias,
            telefone: user.paciente.telefone || null,
            email: user.paciente.email || null,
            nif: user.paciente.nif || null,
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
        const medicoDto = {
            id: user.medico.id,
            clinicaId: user.medico.clinicaId,
            utilizadorId: user.medico.utilizadorId,
            nome: user.medico.nome,
            especialidadeId: user.medico.especialidadeId,
            ordem: user.medico.ordem || null,
            telefoneDireto: user.medico.telefoneDireto || null,
            horario: user.medico.horario,
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
