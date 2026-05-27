"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const vitest_1 = require("vitest");
const subscricao_service_1 = require("../../services/subscricao.service");
const prisma_1 = require("../../lib/prisma");
const notification_service_1 = require("../../services/notification.service");
const types_1 = require("@clinicaplus/types");
const AppError_1 = require("../../lib/AppError");
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        clinica: {
            findUniqueOrThrow: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
        },
        subscricao: {
            create: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
        },
        planoLimite: {
            findUniqueOrThrow: vitest_1.vi.fn(),
        },
        medico: {
            count: vitest_1.vi.fn(),
        },
        agendamento: {
            count: vitest_1.vi.fn(),
        },
        paciente: {
            count: vitest_1.vi.fn(),
        },
        apiKey: {
            count: vitest_1.vi.fn(),
        },
        auditLog: {
            create: vitest_1.vi.fn(),
        },
        $transaction: vitest_1.vi.fn((cb) => cb(prisma_1.prisma)),
    },
}));
vitest_1.vi.mock('../../services/notification.service', () => ({
    notificationService: {
        enviarEmailContaSuspensa: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('subscricao.service', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('criarNovaSubscricao', () => {
        (0, vitest_1.it)('creates a new subscription and updates clinic cache', async () => {
            const mockClinica = { id: 'c1', plano: types_1.Plano.BASICO };
            const mockSubscricao = { id: 's1', validaAte: new Date() };
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUniqueOrThrow).mockResolvedValue(mockClinica);
            vitest_1.vi.mocked(prisma_1.prisma.subscricao.create).mockResolvedValue(mockSubscricao);
            await subscricao_service_1.subscricaoService.criarNovaSubscricao({
                clinicaId: 'c1',
                plano: types_1.Plano.PRO,
                estado: types_1.EstadoSubscricao.ACTIVA,
                razao: types_1.RazaoMudancaPlano.UPGRADE_MANUAL,
                alteradoPor: 'u1',
            });
            (0, vitest_1.expect)(prisma_1.prisma.subscricao.create).toHaveBeenCalled();
            (0, vitest_1.expect)(prisma_1.prisma.clinica.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'c1' },
                data: vitest_1.expect.objectContaining({
                    plano: types_1.Plano.PRO,
                    subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                }),
            }));
            (0, vitest_1.expect)(prisma_1.prisma.auditLog.create).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('verificarLimite', () => {
        (0, vitest_1.it)('throws error when medicos limit reached', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: types_1.Plano.BASICO });
            vitest_1.vi.mocked(prisma_1.prisma.planoLimite.findUniqueOrThrow).mockResolvedValue({ maxMedicos: 5 });
            vitest_1.vi.mocked(prisma_1.prisma.medico.count).mockResolvedValue(5);
            await (0, vitest_1.expect)(subscricao_service_1.subscricaoService.verificarLimite('c1', 'medicos'))
                .rejects.toThrow(AppError_1.AppError);
            try {
                await subscricao_service_1.subscricaoService.verificarLimite('c1', 'medicos');
            }
            catch (err) {
                (0, vitest_1.expect)(err.code).toBe('PLAN_LIMIT_REACHED');
                (0, vitest_1.expect)(err.statusCode).toBe(402);
            }
        });
        (0, vitest_1.it)('allows operation when under limit', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: types_1.Plano.BASICO });
            vitest_1.vi.mocked(prisma_1.prisma.planoLimite.findUniqueOrThrow).mockResolvedValue({ maxMedicos: 5 });
            vitest_1.vi.mocked(prisma_1.prisma.medico.count).mockResolvedValue(4);
            await (0, vitest_1.expect)(subscricao_service_1.subscricaoService.verificarLimite('c1', 'medicos')).resolves.not.toThrow();
        });
        (0, vitest_1.it)('ignores limit if set to -1', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: types_1.Plano.PRO });
            vitest_1.vi.mocked(prisma_1.prisma.planoLimite.findUniqueOrThrow).mockResolvedValue({ maxMedicos: -1 });
            vitest_1.vi.mocked(prisma_1.prisma.medico.count).mockResolvedValue(100);
            await (0, vitest_1.expect)(subscricao_service_1.subscricaoService.verificarLimite('c1', 'medicos')).resolves.not.toThrow();
        });
    });
    (0, vitest_1.describe)('suspender', () => {
        (0, vitest_1.it)('downgrades to BASICO and sends email', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.clinica.findUniqueOrThrow).mockResolvedValue({ id: 'c1', plano: types_1.Plano.PRO });
            vitest_1.vi.mocked(prisma_1.prisma.subscricao.create).mockResolvedValue({ id: 's2', validaAte: new Date() });
            await subscricao_service_1.subscricaoService.suspender('c1');
            (0, vitest_1.expect)(prisma_1.prisma.subscricao.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    plano: types_1.Plano.BASICO,
                    estado: types_1.EstadoSubscricao.SUSPENSA,
                    razao: types_1.RazaoMudancaPlano.DOWNGRADE_AUTO,
                }),
            }));
            (0, vitest_1.expect)(notification_service_1.notificationService.enviarEmailContaSuspensa).toHaveBeenCalledWith('c1');
        });
    });
});
