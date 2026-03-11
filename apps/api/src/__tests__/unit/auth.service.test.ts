import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';
import { AppError } from '../../lib/AppError';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    clinica: {
      findUnique: vi.fn(),
    },
    utilizador: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
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

// Mock the private _issueTokens method to avoid JWT generation during pure unit tests
// We are testing the logic of login/refresh/logout, not the JWT library itself.
authService._issueTokens = vi.fn().mockResolvedValue({
  accessToken: 'mocked-access-token',
  refreshToken: 'mocked-refresh-token',
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth.service', () => {
  const clinicaSlug = 'clinica-test';
  const email = 'user@test.com';
  const password = 'Password123!';
  const mockClinica = { id: 'c1', ativo: true };
  const mockUser = {
    id: 'u1',
    clinicaId: 'c1',
    passwordHash: 'hashed-password',
    ativo: true,
  };

  describe('login', () => {
    it('returns accessToken + refreshToken with valid credentials', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica as any);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.login(email, password, clinicaSlug);

      expect(result).toHaveProperty('accessToken', 'mocked-access-token');
      expect(result).toHaveProperty('refreshToken', 'mocked-refresh-token');
      expect(authService._issueTokens).toHaveBeenCalledWith(mockUser);
    });

    it('throws AppError 401 with wrong password', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica as any);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login(email, password, clinicaSlug))
        .rejects.toThrow(new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS'));
    });

    it('throws AppError 401 with email not found (same message to not reveal existence)', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue(mockClinica as any);
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(null); // User not found

      await expect(authService.login('wrong@test.com', password, clinicaSlug))
        .rejects.toThrow(new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS'));
    });

    it('throws AppError 404 with inactive clinic', async () => {
      vi.mocked(prisma.clinica.findUnique).mockResolvedValue({ ...mockClinica, ativo: false } as any);

      await expect(authService.login(email, password, clinicaSlug))
        .rejects.toThrow(new AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND'));
    });
  });

  describe('refresh', () => {
    const rawToken = 'my-refresh-token';

    it('returns new tokens + marks old as used with valid token', async () => {
      const storedToken = { id: 't1', utilizadorId: 'u1', expiresAt: new Date(Date.now() + 10000), usedAt: null };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(storedToken as any);
      vi.mocked(prisma.utilizador.findUniqueOrThrow).mockResolvedValue(mockUser as any);

      const result = await authService.refresh(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: expect.objectContaining({ usedAt: expect.any(Date) })
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws AppError 401 + deletes all user tokens if token already used', async () => {
      const storedToken = { id: 't1', utilizadorId: 'u1', usedAt: new Date() };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(storedToken as any);

      await expect(authService.refresh(rawToken))
        .rejects.toThrow(new AppError('Token de atualização inválido ou reutilizado', 401, 'TOKEN_REUSE_DETECTED'));

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { utilizadorId: 'u1' }
      });
    });

    it('throws AppError 401 if token is expired', async () => {
      const storedToken = { id: 't1', utilizadorId: 'u1', expiresAt: new Date(Date.now() - 10000), usedAt: null };
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(storedToken as any);

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
    it('generates a token and logs it (returns void) when email exists array', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser as any);
      const signSpy = vi.spyOn(require('jsonwebtoken'), 'sign').mockReturnValue('mock-reset-token');

      await authService.forgotPassword('user@test.com', 'c1');

      expect(signSpy).toHaveBeenCalledWith(
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
      vi.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ sub: 'u1', purpose: 'reset-password' } as any);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

      await authService.resetPassword('valid-token', 'new-pass');

      expect(prisma.utilizador.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: 'new-hash' },
      });
    });

    it('throws AppError 400 if token verify fails', async () => {
      vi.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(authService.resetPassword('invalid-token', 'new-pass'))
        .rejects.toThrow(new AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN'));
    });

    it('throws AppError 400 if token purpose is wrong', async () => {
      vi.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({ sub: 'u1', purpose: 'wrong-purpose' } as any);

      await expect(authService.resetPassword('bad-purpose-token', 'new-pass'))
        .rejects.toThrow(new AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN'));
    });
  });

  describe('changePassword', () => {
    it('updates password when old password is correct', async () => {
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser as any);
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
      vi.mocked(prisma.utilizador.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.changePassword('u1', 'wrong-old', 'new'))
        .rejects.toThrow(new AppError('Palavra-passe atual incorreta', 103, 'INVALID_OLD_PASSWORD'));
    });
  });
});
