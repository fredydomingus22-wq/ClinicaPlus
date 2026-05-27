"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_service_1 = require("../../services/auth.service");
const prisma_1 = require("../../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = require("../../lib/AppError");
const patientNumber_service_1 = require("../../services/patientNumber.service");
vitest_1.vi.mock('../../services/patientNumber.service', () => ({
    generatePatientNumber: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../../services/mfa.service', () => ({
    mfaService: {
        verify: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        clinica: {
            findUnique: vitest_1.vi.fn(),
        },
        utilizador: {
            findUnique: vitest_1.vi.fn(),
            findUniqueOrThrow: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            findFirst: vitest_1.vi.fn(),
        },
        $transaction: vitest_1.vi.fn((cb) => cb(prisma_1.prisma)),
        refreshToken: {
            create: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            deleteMany: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
        },
    },
}));
vitest_1.vi.mock('bcryptjs', () => ({
    default: {
        compare: vitest_1.vi.fn(),
        hash: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vitest_1.vi.fn().mockReturnValue('mock-jwt-token'),
        verify: vitest_1.vi.fn(),
    },
    sign: vitest_1.vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vitest_1.vi.fn(),
}));
// Mock the private _issueTokens method to avoid JWT generation during pure unit tests
// We are testing the logic of login/refresh/logout, not the JWT library itself.
auth_service_1.authService._issueTokens = vitest_1.vi.fn().mockResolvedValue({
    accessToken: 'mocked-access-token',
    refreshToken: 'mocked-refresh-token',
});
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
    // Re-apply after clearAllMocks
    auth_service_1.authService._issueTokens = vitest_1.vi.fn().mockResolvedValue({
        accessToken: 'mocked-access-token',
        refreshToken: 'mocked-refresh-token',
    });
});
(0, vitest_1.describe)('auth.service', () => {
    const clinicaSlug = 'clinica-test';
    const email = 'user@test.com';
    const password = 'Password123!';
    const mockClinica = { id: 'c1', ativo: true };
    const mockUser = {
        id: 'u1',
        clinicaId: 'c1',
        passwordHash: 'hashed-password',
        ativo: true,
        mfaActivatedAt: null,
    };
    (0, vitest_1.describe)('login', () => {
        (0, vitest_1.it)('returns accessToken + refreshToken with valid credentials', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUnique).mockResolvedValue(mockClinica);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(true);
            const result = await auth_service_1.authService.login(email, password, clinicaSlug);
            (0, vitest_1.expect)(result).toHaveProperty('accessToken', 'mocked-access-token');
            (0, vitest_1.expect)(result).toHaveProperty('refreshToken', 'mocked-refresh-token');
            (0, vitest_1.expect)(auth_service_1.authService._issueTokens).toHaveBeenCalledWith(mockUser);
        });
        (0, vitest_1.it)('throws AppError 401 with wrong password', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUnique).mockResolvedValue(mockClinica);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(false);
            await (0, vitest_1.expect)(auth_service_1.authService.login(email, password, clinicaSlug))
                .rejects.toThrow(new AppError_1.AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS'));
        });
        (0, vitest_1.it)('throws AppError 401 with email not found (same message to not reveal existence)', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUnique).mockResolvedValue(mockClinica);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(null);
            await (0, vitest_1.expect)(auth_service_1.authService.login('wrong@test.com', password, clinicaSlug))
                .rejects.toThrow(new AppError_1.AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS'));
        });
        (0, vitest_1.it)('throws AppError 404 with inactive clinic', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUnique).mockResolvedValue({ ...mockClinica, ativo: false });
            await (0, vitest_1.expect)(auth_service_1.authService.login(email, password, clinicaSlug))
                .rejects.toThrow(new AppError_1.AppError('Clínica não encontrada ou inativa', 404, 'CLINICA_NOT_FOUND'));
        });
    });
    (0, vitest_1.describe)('loginSuperAdmin', () => {
        (0, vitest_1.it)('returns setup requirement for valid super admin without MFA', async () => {
            const mockSA = { ...mockUser, papel: 'SUPER_ADMIN', mfaActivatedAt: null };
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findFirst).mockResolvedValue(mockSA);
            vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(true);
            const result = await auth_service_1.authService.loginSuperAdmin(email, password);
            (0, vitest_1.expect)(result).toHaveProperty('requiresMfaSetup', true);
            (0, vitest_1.expect)(result).toHaveProperty('setupToken');
        });
        (0, vitest_1.it)('throws 401 for invalid super admin credentials', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findFirst).mockResolvedValue(null);
            await (0, vitest_1.expect)(auth_service_1.authService.loginSuperAdmin(email, password))
                .rejects.toThrow(AppError_1.AppError);
        });
    });
    (0, vitest_1.describe)('refresh', () => {
        const rawToken = 'my-refresh-token';
        (0, vitest_1.it)('returns new tokens + marks old as used with valid token', async () => {
            const storedToken = { id: 't1', utilizadorId: 'u1', expiresAt: new Date(Date.now() + 10000), usedAt: null };
            vitest_1.vi.mocked(prisma_1.prisma.refreshToken.findUnique).mockResolvedValue(storedToken);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUniqueOrThrow).mockResolvedValue(mockUser);
            const result = await auth_service_1.authService.refresh(rawToken);
            (0, vitest_1.expect)(prisma_1.prisma.refreshToken.update).toHaveBeenCalledWith({
                where: { id: 't1' },
                data: vitest_1.expect.objectContaining({ usedAt: vitest_1.expect.any(Date) })
            });
            (0, vitest_1.expect)(result).toHaveProperty('accessToken');
            (0, vitest_1.expect)(result).toHaveProperty('refreshToken');
        });
        (0, vitest_1.it)('throws AppError 401 + deletes all user tokens if token already used', async () => {
            const storedToken = { id: 't1', utilizadorId: 'u1', usedAt: new Date() };
            vitest_1.vi.mocked(prisma_1.prisma.refreshToken.findUnique).mockResolvedValue(storedToken);
            await (0, vitest_1.expect)(auth_service_1.authService.refresh(rawToken))
                .rejects.toThrow(new AppError_1.AppError('Token de atualização inválido ou reutilizado', 401, 'TOKEN_REUSE_DETECTED'));
            (0, vitest_1.expect)(prisma_1.prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { utilizadorId: 'u1' }
            });
        });
        (0, vitest_1.it)('throws AppError 401 if token is expired', async () => {
            const storedToken = { id: 't1', utilizadorId: 'u1', expiresAt: new Date(Date.now() - 10000), usedAt: null };
            vitest_1.vi.mocked(prisma_1.prisma.refreshToken.findUnique).mockResolvedValue(storedToken);
            await (0, vitest_1.expect)(auth_service_1.authService.refresh(rawToken))
                .rejects.toThrow(new AppError_1.AppError('Sessão expirada ou inválida', 401, 'SESSION_EXPIRED'));
        });
    });
    (0, vitest_1.describe)('logout', () => {
        (0, vitest_1.it)('deletes the RefreshToken from DB', async () => {
            const rawToken = 'my-token-to-delete';
            await auth_service_1.authService.logout(rawToken);
            (0, vitest_1.expect)(prisma_1.prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: rawToken }
            });
        });
    });
    (0, vitest_1.describe)('forgotPassword', () => {
        (0, vitest_1.it)('generates a token and logs it (returns void) when email exists', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(jsonwebtoken_1.default.sign).mockReturnValue('mock-reset-token');
            await auth_service_1.authService.forgotPassword('user@test.com', 'c1');
            (0, vitest_1.expect)(jsonwebtoken_1.default.sign).toHaveBeenCalledWith({ sub: 'u1', purpose: 'reset-password' }, vitest_1.expect.any(String), { expiresIn: '15m' });
        });
        (0, vitest_1.it)('returns void without throwing if user does not exist (prevents enumeration)', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(null);
            await (0, vitest_1.expect)(auth_service_1.authService.forgotPassword('wrong@test.com', 'c1')).resolves.toBeUndefined();
        });
    });
    (0, vitest_1.describe)('resetPassword', () => {
        (0, vitest_1.it)('updates password when valid token is provided', async () => {
            vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockReturnValue({ sub: 'u1', purpose: 'reset-password' });
            vitest_1.vi.mocked(bcryptjs_1.default.hash).mockResolvedValue('new-hash');
            await auth_service_1.authService.resetPassword('valid-token', 'new-pass');
            (0, vitest_1.expect)(prisma_1.prisma.utilizador.update).toHaveBeenCalledWith({
                where: { id: 'u1' },
                data: { passwordHash: 'new-hash' },
            });
        });
        (0, vitest_1.it)('throws AppError 400 if token verify fails', async () => {
            vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockImplementation(() => {
                throw new Error('invalid signature');
            });
            await (0, vitest_1.expect)(auth_service_1.authService.resetPassword('invalid-token', 'new-pass'))
                .rejects.toThrow(new AppError_1.AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN'));
        });
        (0, vitest_1.it)('throws AppError 400 if token purpose is wrong', async () => {
            vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockReturnValue({ sub: 'u1', purpose: 'wrong-purpose' });
            await (0, vitest_1.expect)(auth_service_1.authService.resetPassword('bad-purpose-token', 'new-pass'))
                .rejects.toThrow(new AppError_1.AppError('Token de recuperação inválido ou expirado', 400, 'INVALID_RESET_TOKEN'));
        });
    });
    (0, vitest_1.describe)('changePassword', () => {
        (0, vitest_1.it)('updates password when old password is correct', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(true);
            vitest_1.vi.mocked(bcryptjs_1.default.hash).mockResolvedValue('new-hash');
            await auth_service_1.authService.changePassword('u1', 'old-pass', 'new-pass');
            (0, vitest_1.expect)(prisma_1.prisma.utilizador.update).toHaveBeenCalledWith({
                where: { id: 'u1' },
                data: { passwordHash: 'new-hash' },
            });
        });
        (0, vitest_1.it)('throws AppError 404 if user not found', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(null);
            await (0, vitest_1.expect)(auth_service_1.authService.changePassword('u1', 'old', 'new'))
                .rejects.toThrow(new AppError_1.AppError('Utilizador não encontrado', 404, 'USER_NOT_FOUND'));
        });
        (0, vitest_1.it)('throws AppError 103 if old password is wrong', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(mockUser);
            vitest_1.vi.mocked(bcryptjs_1.default.compare).mockResolvedValue(false);
            await (0, vitest_1.expect)(auth_service_1.authService.changePassword('u1', 'wrong-old', 'new'))
                .rejects.toThrow(new AppError_1.AppError('Palavra-passe atual incorreta', 103, 'INVALID_OLD_PASSWORD'));
        });
    });
    (0, vitest_1.describe)('registerPaciente', () => {
        const registerData = {
            nome: 'Novo Paciente',
            email: 'novo@paciente.com',
            password: 'Pass123!',
            dataNascimento: new Date('1990-01-01'),
            genero: 'M',
            alergias: [],
            seguroSaude: false,
            clinicaSlug: 'slug-test',
        };
        (0, vitest_1.it)('creates a new user and patient in a transaction', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUnique).mockResolvedValue(mockClinica);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(null);
            vitest_1.vi.mocked(bcryptjs_1.default.hash).mockResolvedValue('hash');
            vitest_1.vi.mocked(patientNumber_service_1.generatePatientNumber).mockResolvedValue('P-001');
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.create).mockResolvedValue({ ...mockUser, nome: registerData.nome, papel: 'PACIENTE' });
            const result = await auth_service_1.authService.registerPaciente(registerData, 'slug-test');
            (0, vitest_1.expect)(result).toHaveProperty('accessToken');
            (0, vitest_1.expect)(prisma_1.prisma.utilizador.create).toHaveBeenCalled();
            (0, vitest_1.expect)(patientNumber_service_1.generatePatientNumber).toHaveBeenCalledWith('c1');
        });
        (0, vitest_1.it)('throws 409 if email already exists', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUnique).mockResolvedValue(mockClinica);
            vitest_1.vi.mocked(prisma_1.prisma.utilizador.findUnique).mockResolvedValue(mockUser);
            await (0, vitest_1.expect)(auth_service_1.authService.registerPaciente(registerData, 'slug-test')).rejects.toThrow(new AppError_1.AppError('Este e-mail já está registado.', 409, 'DUPLICATE_ENTRY'));
        });
    });
});
