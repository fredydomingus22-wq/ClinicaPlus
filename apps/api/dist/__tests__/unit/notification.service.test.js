"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../lib/prisma");
const { mockSend } = vitest_1.vi.hoisted(() => ({
    mockSend: vitest_1.vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null })
}));
vitest_1.vi.mock('resend', () => ({
    Resend: class {
        constructor() {
            this.emails = {
                send: mockSend,
            };
        }
    },
}));
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        contactoClinica: {
            findMany: vitest_1.vi.fn(),
        },
    },
}));
// We need to import the service AFTER mocking Resend if it's initialized at module level
const notification_service_1 = require("../../services/notification.service");
(0, vitest_1.describe)('notification.service', () => {
    const mockData = {
        pacienteEmail: 'patient@test.com',
        pacienteNome: 'João Silva',
        medicoNome: 'Dr. Teste',
        clinicaNome: 'Clínica Central',
        dataHora: new Date(),
        tipo: 'CONSULTA',
        clinicaId: 'c1',
    };
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('sendConfirmacaoAgendamento', () => {
        (0, vitest_1.it)('sends an email when patient has an email address', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.contactoClinica.findMany).mockResolvedValue([]);
            await notification_service_1.notificationService.sendConfirmacaoAgendamento(mockData);
            (0, vitest_1.expect)(mockSend).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                to: 'patient@test.com',
                subject: vitest_1.expect.stringContaining('Confirmado'),
            }));
        });
        (0, vitest_1.it)('skips sending email when patientEmail is missing', async () => {
            await notification_service_1.notificationService.sendConfirmacaoAgendamento({ ...mockData, pacienteEmail: '' });
            (0, vitest_1.expect)(mockSend).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('continues sending even if contacts fetch fails', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.contactoClinica.findMany).mockRejectedValue(new Error('DB Error'));
            await (0, vitest_1.expect)(notification_service_1.notificationService.sendConfirmacaoAgendamento(mockData)).resolves.toBeUndefined();
            (0, vitest_1.expect)(mockSend).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('sendResetPassword', () => {
        (0, vitest_1.it)('sends reset email with correct URL', async () => {
            const resetData = {
                email: 'user@test.com',
                nome: 'Utilizador',
                resetUrl: 'http://localhost:5173/reset-password?token=token123',
                expiresInMinutes: 15
            };
            await notification_service_1.notificationService.sendResetPassword(resetData);
            (0, vitest_1.expect)(mockSend).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                to: 'user@test.com',
                html: vitest_1.expect.stringContaining('token123'),
            }));
        });
    });
});
