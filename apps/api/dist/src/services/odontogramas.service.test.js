"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const odontogramas_service_1 = require("./odontogramas.service");
const prisma_1 = require("../lib/prisma");
const AppError_1 = require("../lib/AppError");
const types_1 = require("@clinicaplus/types");
vitest_1.vi.mock('../lib/prisma', () => ({
    prisma: {
        agendamento: { findFirst: vitest_1.vi.fn() },
        odontograma: {
            findFirst: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
        },
    },
}));
const clinicaId = 'clinica-1';
const agendamentoId = 'agend-1';
const pacienteId = 'pac-1';
const medicoId = 'med-1';
const agendamentoMock = {
    id: agendamentoId,
    clinicaId,
    pacienteId,
    medicoId,
};
const marcacoes = [
    { numeroDente: 16, face: types_1.DenteFace.O, status: types_1.DenteStatus.CARIE },
];
(0, vitest_1.describe)('OdontogramaService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('create', () => {
        (0, vitest_1.it)('deve criar odontograma quando agendamento pertence à clínica e médico coincide', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findFirst).mockResolvedValue(agendamentoMock);
            vitest_1.vi.mocked(prisma_1.prisma.odontograma.findFirst).mockResolvedValue(null);
            vitest_1.vi.mocked(prisma_1.prisma.odontograma.create).mockResolvedValue({
                id: 'odo-1',
                clinicaId,
                pacienteId,
                medicoId,
                agendamentoId,
                marcacoes,
                criadoEm: new Date('2026-01-01'),
                atualizadoEm: new Date('2026-01-01'),
            });
            const result = await odontogramas_service_1.OdontogramaService.create(clinicaId, {
                agendamentoId,
                pacienteId,
                medicoId,
                marcacoes,
            });
            (0, vitest_1.expect)(result.marcacoes).toEqual(marcacoes);
            (0, vitest_1.expect)(prisma_1.prisma.odontograma.create).toHaveBeenCalled();
        });
        (0, vitest_1.it)('deve actualizar odontograma existente para o mesmo agendamento (upsert)', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findFirst).mockResolvedValue(agendamentoMock);
            vitest_1.vi.mocked(prisma_1.prisma.odontograma.findFirst).mockResolvedValue({
                id: 'odo-1',
                clinicaId,
                agendamentoId,
                marcacoes: [],
                criadoEm: new Date(),
                atualizadoEm: new Date(),
            });
            vitest_1.vi.mocked(prisma_1.prisma.odontograma.update).mockResolvedValue({
                id: 'odo-1',
                clinicaId,
                pacienteId,
                medicoId,
                agendamentoId,
                marcacoes,
                criadoEm: new Date('2026-01-01'),
                atualizadoEm: new Date('2026-01-02'),
            });
            const result = await odontogramas_service_1.OdontogramaService.create(clinicaId, {
                agendamentoId,
                pacienteId,
                medicoId,
                marcacoes,
            });
            (0, vitest_1.expect)(prisma_1.prisma.odontograma.update).toHaveBeenCalled();
            (0, vitest_1.expect)(result.marcacoes).toEqual(marcacoes);
        });
        (0, vitest_1.it)('deve rejeitar quando médico não corresponde ao agendamento', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.agendamento.findFirst).mockResolvedValue(agendamentoMock);
            await (0, vitest_1.expect)(odontogramas_service_1.OdontogramaService.create(clinicaId, {
                agendamentoId,
                pacienteId,
                medicoId: 'outro-medico',
                marcacoes,
            })).rejects.toThrow(AppError_1.AppError);
        });
    });
    (0, vitest_1.describe)('getByAgendamento', () => {
        (0, vitest_1.it)('deve retornar null quando não existe registo para a consulta', async () => {
            vitest_1.vi.mocked(prisma_1.prisma.odontograma.findFirst).mockResolvedValue(null);
            const result = await odontogramas_service_1.OdontogramaService.getByAgendamento(clinicaId, agendamentoId);
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
});
