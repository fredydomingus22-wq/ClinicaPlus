import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../lib/AppError';
import { generatePatientNumber } from '../../services/patientNumber.service';
import type { Utilizador, RefreshToken, Clinica } from '@prisma/client';

vi.mock('../../services/patientNumber.service', () => ({
  generatePatientNumber: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    clinica: {
      findUnique: vi.fn(),
    },
    utilizador: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)),
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn(),
  },
}));

// Mock the private _issueTokens method to avoid JWT generation during pure unit tests
// We are testing the logic of login/refresh/logout, not the JWT library itself.
authService._issueTokens = vi.fn().mockResolvedValue({
  accessToken: 'mocked-access-token',
  refreshToken: 'mocked-refresh-token',
});

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply after clearAllMocks
  authService._issueTokens = vi.fn().mockResolvedValue({
    accessToken: 'mocked-access-token',
    refreshToken: 'mocked-refresh-token',
  });
});

describe('auth.service', () => {
  const clinicaSlug = 'clinica-test';
  const email = 'user@test.com';
  const password = 'Password123!';
  const mockClinica = { id: 'c1', ativo: true } as unknown as Clinica;
  const mockUser = {
    id: 'u1',
    clinicaId: 'c1',
    passwordHash: 'hashed-password',
    ativo: true,
  } as unknown as Utilizador;

  describe('login', () => {
    it('returns accessToken + refreshToken with valid credentials', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.login(email, password, clinicaSlug);

      expect(result).toHaveProperty('accessToken', 'mocked-access-token');
      expect(result).toHaveProperty('refreshToken', 'mocked-refresh-token');
      expect(authService._issueTokens).toHaveBeenCalledWith(mockUser);
    });

    it('throws AppError 401 with wrong password', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login(email, password, clinicaSlug))
        .rejects.toThrow(new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS'));
    });

    it('throws AppError 401 with email not found (same message to not reveal existence)', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(null);

      await expect(authService.login('wrong@test.com', password, clinicaSlug))
        .rejects.toThrow(new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS'));
    });

    it('throws AppError 404 with inactive clinic', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue({ ...mockClinica, ativo: false });

      await expect(authService.login(email, password, clinicaSlug))
        .rejects.toThrow(new AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND'));
    });
  });

  describe('loginSuperAdmin', () => {
    it('returns tokens for valid super admin', async () => {
      const mockSA = { ...mockUser, papel: 'SUPER_ADMIN' } as unknown as Utilizador;
      vi.mocked(prisma.utilizador.findFirst).mockResolvedValue(mockSA);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.loginSuperAdmin(email, password);

      expect(result).toHaveProperty('accessToken');
      expect(prisma.utilizador.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { email, papel: 'SUPER_ADMIN' }
      }));
    });

    it('throws 401 for invalid super admin credentials', async () => {
      vi.mocked(prisma.utilizador.findFirst).mockResolvedValue(null);

      await expect(authService.loginSuperAdmin(email, password))
        .rejects.toThrow(AppError);
    });
  });

  describe('refresh', () => {
    const rawToken = 'my-refresh-token';

    it('returns new tokens + marks old as used with valid token', async () => {
      const storedToken = { id: 't1', utilizadorId: 'u1', expiresAt: new Date(Date.now() + 10000), usedAt: null } as unknown as RefreshToken;
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(storedToken);
      vi.mocked(prisma.utilizador.findUniqueOrThrow).mockResolvedValue(mockUser);

      const result = await authService.refresh(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) })
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws AppError 401 + deletes all user tokens if token already used', async () => {
      const storedToken = { id: 't1', utilizadorId: 'u1', usedAt: new Date() } as unknown as RefreshToken;
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(storedToken);

      await expect(authService.refresh(rawToken))
        .rejects.toThrow(new AppError('Token de atualização inválido ou reutilizado', 401, 'TOKEN_REUSE_DETECTED'));

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { utilizadorId: 'u1' }
      });
    });

    it('throws AppError 401 if token is expired', async () => {
      const storedToken = { id: 't1', utilizadorId: 'u1', expiresAt: new Date(Date.now() - 10000), usedAt: null } as unknown as RefreshToken;
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(storedToken);

      await expect(authService.refresh(rawToken))
        .rejects.toThrow(new AppError('Sessão expirada ou inválida', 401, 'SESSION_EXPIRED'));
    });
  });

  describe('logout', () => {
    it('deletes the RefreshToken from DB', async () => {
      const rawToken = 'my-token-to-delete';
      await authService.logout(rawToken);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: rawToken }
      });
    });
  });

  describe('forgotPassword', () => {
    it('generates a token and logs it (returns void) when email exists', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser);
      vi.mocked(jwt.sign).mockReturnValue('mock-reset-token' as never);

      await authService.forgotPassword('user@test.com', 'c1');

      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'u1', purpose: 'reset-password' },
        expect.any(String),
        { expiresIn: '15m' }
      );
    });

    it('returns void without throwing if user does not exist (prevents enumeration)', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(null);
      
      await expect(authService.forgotPassword('wrong@test.com', 'c1')).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('updates password when valid token is provided', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ sub: 'u1', purpose: 'reset-password' } as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

      await authService.resetPassword('valid-token', 'new-pass');

      expect(prisma.utilizador.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: 'new-hash' },
      });
    });

    it('throws AppError 400 if token verify fails', async () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(authService.resetPassword('invalid-token', 'new-pass'))
        .rejects.toThrow(new AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN'));
    });

    it('throws AppError 400 if token purpose is wrong', async () => {
      vi.mocked(jwt.verify).mockReturnValue({ sub: 'u1', purpose: 'wrong-purpose' } as never);

      await expect(authService.resetPassword('bad-purpose-token', 'new-pass'))
        .rejects.toThrow(new AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN'));
    });
  });

  describe('changePassword', () => {
    it('updates password when old password is correct', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

      await authService.changePassword('u1', 'old-pass', 'new-pass');

      expect(prisma.utilizador.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: 'new-hash' },
      });
    });

    it('throws AppError 404 if user not found', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(null);

      await expect(authService.changePassword('u1', 'old', 'new'))
        .rejects.toThrow(new AppError('Utilizador não encontrado', 404, 'USER_NOT_FOUND'));
    });

    it('throws AppError 103 if old password is wrong', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.changePassword('u1', 'wrong-old', 'new'))
        .rejects.toThrow(new AppError('Palavra-passe atual incorreta', 103, 'INVALID_OLD_PASSWORD'));
    });
  });

  describe('registerPaciente', () => {
    const registerData = {
      nome: 'Novo Paciente',
      email: 'novo@paciente.com',
      password: 'Pass123!',
      dataNascimento: new Date('1990-01-01'),
      genero: 'M' as const,
      alergias: [] as string[],
      seguroSaude: false,
      clinicaSlug: 'slug-test',
    };

    it('creates a new user and patient in a transaction', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hash' as never);
      vi.mocked(generatePatientNumber).mockResolvedValue('P-001');
      vi.mocked(prisma.utilizador.create).mockResolvedValue({ ...mockUser, nome: registerData.nome, papel: 'PACIENTE' } as unknown as Utilizador);

      const result = await authService.registerPaciente(
        registerData as unknown as Parameters<typeof authService.registerPaciente>[0],
        'slug-test'
      );

      expect(result).toHaveProperty('accessToken');
      expect(prisma.utilizador.create).toHaveBeenCalled();
      expect(generatePatientNumber).toHaveBeenCalledWith('c1');
    });

    it('throws 409 if email already exists', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser);

      await expect(authService.registerPaciente(
        registerData as unknown as Parameters<typeof authService.registerPaciente>[0],
        'slug-test'
      )).rejects.toThrow(new AppError('Este e-mail já está registado.', 409, 'DUPLICATE_ENTRY'));
    });
  });
});
