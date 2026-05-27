"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const contactResolver_1 = require("./contactResolver");
const prisma_1 = require("../prisma");
// Mock prisma
vitest_1.vi.mock('../prisma', () => ({
    prisma: {
        paciente: {
            findFirst: vitest_1.vi.fn(),
        },
        utilizador: {
            findFirst: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('contactResolver', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('getPacienteContact', () => {
        (0, vitest_1.it)('deve retornar contato normalizado quando paciente encontrado com telefone', async () => {
            prisma_1.prisma.paciente.findFirst.mockResolvedValue({
                id: 'pac-1',
                nome: 'João Silva',
                telefone: '923456789',
            });
            const result = await (0, contactResolver_1.getPacienteContact)('pac-1', 'clinica-1');
            (0, vitest_1.expect)(result).toEqual({
                phone: '+244923456789',
                jid: '244923456789@s.whatsapp.net',
                name: 'João Silva',
                type: 'paciente',
                id: 'pac-1',
            });
        });
        (0, vitest_1.it)('deve lançar erro quando paciente não encontrado', async () => {
            prisma_1.prisma.paciente.findFirst.mockResolvedValue(null);
            await (0, vitest_1.expect)((0, contactResolver_1.getPacienteContact)('pac-1', 'clinica-1')).rejects.toThrow(contactResolver_1.ContactNotFoundError);
        });
        (0, vitest_1.it)('deve lançar erro quando paciente sem telefone', async () => {
            prisma_1.prisma.paciente.findFirst.mockResolvedValue({
                id: 'pac-1',
                nome: 'João Silva',
                telefone: null,
            });
            await (0, vitest_1.expect)((0, contactResolver_1.getPacienteContact)('pac-1', 'clinica-1')).rejects.toThrow(contactResolver_1.ContactNotFoundError);
        });
    });
    (0, vitest_1.describe)('getUtilizadorContact', () => {
        (0, vitest_1.it)('deve retornar contato normalizado quando utilizador encontrado com telefone', async () => {
            prisma_1.prisma.utilizador.findFirst.mockResolvedValue({
                id: 'usr-1',
                nome: 'Dr. Maria Santos',
                paciente: {
                    telefone: '923456789',
                },
            });
            const result = await (0, contactResolver_1.getUtilizadorContact)('usr-1', 'clinica-1');
            (0, vitest_1.expect)(result).toEqual({
                phone: '+244923456789',
                jid: '244923456789@s.whatsapp.net',
                name: 'Dr. Maria Santos',
                type: 'utilizador',
                id: 'usr-1',
            });
        });
        (0, vitest_1.it)('deve lançar erro quando utilizador não encontrado', async () => {
            prisma_1.prisma.utilizador.findFirst.mockResolvedValue(null);
            await (0, vitest_1.expect)((0, contactResolver_1.getUtilizadorContact)('usr-1', 'clinica-1')).rejects.toThrow(contactResolver_1.ContactNotFoundError);
        });
    });
    (0, vitest_1.describe)('getContact', () => {
        (0, vitest_1.it)('deve chamar getPacienteContact quando tipo é paciente', async () => {
            prisma_1.prisma.paciente.findFirst.mockResolvedValue({
                id: 'pac-1',
                nome: 'João Silva',
                telefone: '923456789',
            });
            await (0, contactResolver_1.getContact)('pac-1', 'paciente', 'clinica-1');
            (0, vitest_1.expect)(prisma_1.prisma.paciente.findFirst).toHaveBeenCalled();
        });
        (0, vitest_1.it)('deve chamar getUtilizadorContact quando tipo é utilizador', async () => {
            prisma_1.prisma.utilizador.findFirst.mockResolvedValue({
                id: 'usr-1',
                nome: 'Dr. Maria Santos',
                paciente: {
                    telefone: '923456789',
                },
            });
            await (0, contactResolver_1.getContact)('usr-1', 'utilizador', 'clinica-1');
            (0, vitest_1.expect)(prisma_1.prisma.utilizador.findFirst).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('formatGreeting', () => {
        (0, vitest_1.it)('deve formatar saudação informal com primeiro nome', () => {
            (0, vitest_1.expect)((0, contactResolver_1.formatGreeting)('João Silva Santos', false)).toBe('Olá, João');
        });
        (0, vitest_1.it)('deve formatar saudação formal com primeiro nome', () => {
            (0, vitest_1.expect)((0, contactResolver_1.formatGreeting)('João Silva Santos', true)).toBe('Olá, João');
        });
        (0, vitest_1.it)('deve manter tratamento Dr./Dra. quando presente', () => {
            (0, vitest_1.expect)((0, contactResolver_1.formatGreeting)('Dr. João Silva', true)).toBe('Olá, Dr. João Silva');
        });
    });
});
