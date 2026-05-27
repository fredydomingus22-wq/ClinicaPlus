"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const vitest_1 = require("vitest");
const notificacoes_service_1 = require("../../services/notificacoes.service");
const prisma_1 = require("../../lib/prisma");
// Mock prisma
vitest_1.vi.mock('../../lib/prisma', () => ({
    prisma: {
        notificacao: {
            create: vitest_1.vi.fn(),
        },
        utilizador: {
            findUnique: vitest_1.vi.fn(),
        }
    },
}));
(0, vitest_1.describe)('NotificacoesService URL Logic (TDD)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('deve manter a URL original se ela já estiver prefixada', async () => {
        const data = {
            utilizadorId: 'user-1',
            titulo: 'Teste',
            mensagem: 'Teste',
            tipo: 'INFO',
            url: '/admin/configuracao'
        };
        await notificacoes_service_1.notificacoesService.create(data);
        (0, vitest_1.expect)(prisma_1.prisma.notificacao.create).toHaveBeenCalledWith({
            data: vitest_1.expect.objectContaining({
                url: '/admin/configuracao'
            })
        });
    });
    (0, vitest_1.it)('deve prefixar uma URL genérica com base no papel do utilizador (FALHA ESPERADA)', async () => {
        // Mock user role as ADMIN
        prisma_1.prisma.utilizador.findUnique.mockResolvedValue({ id: 'user-admin', papel: 'ADMIN' });
        const data = {
            utilizadorId: 'user-admin',
            titulo: 'Novo Agendamento',
            mensagem: 'Mensagem',
            tipo: 'AGENDAMENTO',
            url: '/agendamentos' // URL genérica
        };
        // Act
        await notificacoes_service_1.notificacoesService.create(data);
        // Assert - Esperamos que o service agora resolva o papel e prefixe a URL
        // Nota: O teste vai falhar inicialmente porque o service ainda não faz isto.
        (0, vitest_1.expect)(prisma_1.prisma.notificacao.create).toHaveBeenCalledWith({
            data: vitest_1.expect.objectContaining({
                url: '/admin/agendamentos'
            })
        });
    });
});
