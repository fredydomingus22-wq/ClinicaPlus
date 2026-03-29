import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Utilizador, Papel } from '@prisma/client';
import { authenticator } from 'otplib';
import { mockPrisma } from '../../test/mocks/prisma.mock';

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));

// Import the service AFTER the mocks to avoid initialization errors
import { mfaService } from '../mfa.service';

describe('mfaService', () => {
  const userId = 'user-super-admin-1';
  let mockUser: Pick<Utilizador, 'id' | 'email' | 'mfaSecret' | 'mfaPending' | 'mfaActivatedAt' | 'papel'>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: userId,
      email: 'super@admin.com',
      mfaSecret: null,
      mfaPending: false,
      mfaActivatedAt: null,
      papel: Papel.SUPER_ADMIN,
    };
  });

  describe('setup', () => {
    it('deve gerar secret, QRCode, e atualizar user na DB com mfaPending = true', async () => {
      vi.mocked(mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser as unknown as Utilizador);
      vi.mocked(mockPrisma.utilizador.update).mockResolvedValue({ ...mockUser, mfaPending: true } as unknown as Utilizador);

      const result = await mfaService.setup(userId);

      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toContain('data:image/png;base64,');
      expect(mockPrisma.utilizador.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            mfaSecret: expect.any(String), // Secret encriptado
            mfaPending: true,
          }),
        })
      );
    });

    it('deve atirar erro se utilizador não for encontrado', async () => {
      vi.mocked(mockPrisma.utilizador.findUnique).mockResolvedValue(null);
      await expect(mfaService.setup(userId)).rejects.toThrow('Utilizador não encontrado');
    });
  });

  describe('encryption/decryption', () => {
    it('deve encriptar e decriptar corretamente um segredo', () => {
      const originalSecret = authenticator.generateSecret();
      // O método encrypt/decrypt não é exportado por default, mas é testado via fluxo ou podemos expor para test
      // Testaremos indiretamente via activate/verify se quisermos ou tornamos públicos para testar
      const encrypted = mfaService._encrypt(originalSecret);
      expect(encrypted).not.toBe(originalSecret);
      expect(encrypted).toContain(':'); // formato iv:content

      const decrypted = mfaService._decrypt(encrypted);
      expect(decrypted).toBe(originalSecret);
    });
  });

  describe('activate', () => {
    it('deve ativar o MFA se token for válido', async () => {
      const plainSecret = authenticator.generateSecret();
      const encryptedSecret = mfaService._encrypt(plainSecret);
      mockUser.mfaSecret = encryptedSecret;
      mockUser.mfaPending = true;

      vi.mocked(mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser as unknown as Utilizador);
      vi.mocked(mockPrisma.utilizador.update).mockResolvedValue({ ...mockUser, mfaPending: false, mfaActivatedAt: new Date() } as unknown as Utilizador);

      const validToken = authenticator.generate(plainSecret);
      const result = await mfaService.activate(userId, validToken);

      expect(result).toBe(true);
      expect(mockPrisma.utilizador.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            mfaPending: false,
            mfaActivatedAt: expect.any(Date),
          }),
        })
      );
    });

    it('deve atirar erro se token for inválido no activate', async () => {
      const plainSecret = authenticator.generateSecret();
      const encryptedSecret = mfaService._encrypt(plainSecret);
      mockUser.mfaSecret = encryptedSecret;
      mockUser.mfaPending = true;

      vi.mocked(mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser as unknown as Utilizador);

      const invalidToken = '000000';
      await expect(mfaService.activate(userId, invalidToken)).rejects.toThrow('Código MFA inválido');
    });
  });

  describe('verify', () => {
    it('deve retornar true se token for válido e MFA estiver ativado', async () => {
      const plainSecret = authenticator.generateSecret();
      const encryptedSecret = mfaService._encrypt(plainSecret);
      mockUser.mfaSecret = encryptedSecret;
      mockUser.mfaActivatedAt = new Date();

      vi.mocked(mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser as unknown as Utilizador);

      const validToken = authenticator.generate(plainSecret);
      const result = await mfaService.verify(userId, validToken);

      expect(result).toBe(true);
    });

    it('deve retornar false se token for inválido', async () => {
      const plainSecret = authenticator.generateSecret();
      const encryptedSecret = mfaService._encrypt(plainSecret);
      mockUser.mfaSecret = encryptedSecret;
      mockUser.mfaActivatedAt = new Date();

      vi.mocked(mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser as unknown as Utilizador);

      const invalidToken = '000000';
      const result = await mfaService.verify(userId, invalidToken);

      expect(result).toBe(false);
    });
  });
});
