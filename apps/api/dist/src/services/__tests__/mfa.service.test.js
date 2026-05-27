"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("@prisma/client");
const otplib_1 = require("otplib");
const prisma_mock_1 = require("../../test/mocks/prisma.mock");
vitest_1.vi.mock('../../lib/prisma', () => ({ prisma: prisma_mock_1.mockPrisma }));
// Import the service AFTER the mocks to avoid initialization errors
const mfa_service_1 = require("../mfa.service");
(0, vitest_1.describe)('mfaService', () => {
    const userId = 'user-super-admin-1';
    let mockUser;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockUser = {
            id: userId,
            email: 'super@admin.com',
            mfaSecret: null,
            mfaPending: false,
            mfaActivatedAt: null,
            papel: client_1.Papel.SUPER_ADMIN,
        };
    });
    (0, vitest_1.describe)('setup', () => {
        (0, vitest_1.it)('deve gerar secret, QRCode, e atualizar user na DB com mfaPending = true', async () => {
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.update).mockResolvedValue({ ...mockUser, mfaPending: true });
            const result = await mfa_service_1.mfaService.setup(userId);
            (0, vitest_1.expect)(result.secret).toBeDefined();
            (0, vitest_1.expect)(result.qrCodeUrl).toContain('data:image/png;base64,');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.utilizador.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: userId },
                data: vitest_1.expect.objectContaining({
                    mfaSecret: vitest_1.expect.any(String), // Secret encriptado
                    mfaPending: true,
                }),
            }));
        });
        (0, vitest_1.it)('deve atirar erro se utilizador não for encontrado', async () => {
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.findUnique).mockResolvedValue(null);
            await (0, vitest_1.expect)(mfa_service_1.mfaService.setup(userId)).rejects.toThrow('Utilizador não encontrado');
        });
    });
    (0, vitest_1.describe)('encryption/decryption', () => {
        (0, vitest_1.it)('deve encriptar e decriptar corretamente um segredo', () => {
            const originalSecret = otplib_1.authenticator.generateSecret();
            // O método encrypt/decrypt não é exportado por default, mas é testado via fluxo ou podemos expor para test
            // Testaremos indiretamente via activate/verify se quisermos ou tornamos públicos para testar
            const encrypted = mfa_service_1.mfaService._encrypt(originalSecret);
            (0, vitest_1.expect)(encrypted).not.toBe(originalSecret);
            (0, vitest_1.expect)(encrypted).toContain(':'); // formato iv:content
            const decrypted = mfa_service_1.mfaService._decrypt(encrypted);
            (0, vitest_1.expect)(decrypted).toBe(originalSecret);
        });
    });
    (0, vitest_1.describe)('activate', () => {
        (0, vitest_1.it)('deve ativar o MFA se token for válido', async () => {
            const plainSecret = otplib_1.authenticator.generateSecret();
            const encryptedSecret = mfa_service_1.mfaService._encrypt(plainSecret);
            mockUser.mfaSecret = encryptedSecret;
            mockUser.mfaPending = true;
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.update).mockResolvedValue({ ...mockUser, mfaPending: false, mfaActivatedAt: new Date() });
            const validToken = otplib_1.authenticator.generate(plainSecret);
            const result = await mfa_service_1.mfaService.activate(userId, validToken);
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.utilizador.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: userId },
                data: vitest_1.expect.objectContaining({
                    mfaPending: false,
                    mfaActivatedAt: vitest_1.expect.any(Date),
                }),
            }));
        });
        (0, vitest_1.it)('deve atirar erro se token for inválido no activate', async () => {
            const plainSecret = otplib_1.authenticator.generateSecret();
            const encryptedSecret = mfa_service_1.mfaService._encrypt(plainSecret);
            mockUser.mfaSecret = encryptedSecret;
            mockUser.mfaPending = true;
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser);
            const invalidToken = '000000';
            await (0, vitest_1.expect)(mfa_service_1.mfaService.activate(userId, invalidToken)).rejects.toThrow('Código MFA inválido');
        });
    });
    (0, vitest_1.describe)('verify', () => {
        (0, vitest_1.it)('deve retornar true se token for válido e MFA estiver ativado', async () => {
            const plainSecret = otplib_1.authenticator.generateSecret();
            const encryptedSecret = mfa_service_1.mfaService._encrypt(plainSecret);
            mockUser.mfaSecret = encryptedSecret;
            mockUser.mfaActivatedAt = new Date();
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser);
            const validToken = otplib_1.authenticator.generate(plainSecret);
            const result = await mfa_service_1.mfaService.verify(userId, validToken);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('deve retornar false se token for inválido', async () => {
            const plainSecret = otplib_1.authenticator.generateSecret();
            const encryptedSecret = mfa_service_1.mfaService._encrypt(plainSecret);
            mockUser.mfaSecret = encryptedSecret;
            mockUser.mfaActivatedAt = new Date();
            vitest_1.vi.mocked(prisma_mock_1.mockPrisma.utilizador.findUnique).mockResolvedValue(mockUser);
            const invalidToken = '000000';
            const result = await mfa_service_1.mfaService.verify(userId, invalidToken);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
});
