import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPacienteContact,
  getUtilizadorContact,
  getContact,
  formatGreeting,
  ContactNotFoundError,
} from './contactResolver';
import { prisma } from '../prisma';

// Mock prisma
vi.mock('../prisma', () => ({
  prisma: {
    paciente: {
      findFirst: vi.fn(),
    },
    utilizador: {
      findFirst: vi.fn(),
    },
  },
}));

describe('contactResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPacienteContact', () => {
    it('deve retornar contato normalizado quando paciente encontrado com telefone', async () => {
      (prisma.paciente.findFirst as any).mockResolvedValue({
        id: 'pac-1',
        nome: 'João Silva',
        telefone: '923456789',
      });

      const result = await getPacienteContact('pac-1', 'clinica-1');

      expect(result).toEqual({
        phone: '+244923456789',
        jid: '244923456789@s.whatsapp.net',
        name: 'João Silva',
        type: 'paciente',
        id: 'pac-1',
      });
    });

    it('deve lançar erro quando paciente não encontrado', async () => {
      (prisma.paciente.findFirst as any).mockResolvedValue(null);

      await expect(getPacienteContact('pac-1', 'clinica-1')).rejects.toThrow(
        ContactNotFoundError
      );
    });

    it('deve lançar erro quando paciente sem telefone', async () => {
      (prisma.paciente.findFirst as any).mockResolvedValue({
        id: 'pac-1',
        nome: 'João Silva',
        telefone: null,
      });

      await expect(getPacienteContact('pac-1', 'clinica-1')).rejects.toThrow(
        ContactNotFoundError
      );
    });
  });

  describe('getUtilizadorContact', () => {
    it('deve retornar contato normalizado quando utilizador encontrado com telefone', async () => {
      (prisma.utilizador.findFirst as any).mockResolvedValue({
        id: 'usr-1',
        nome: 'Dr. Maria Santos',
        paciente: {
          telefone: '923456789',
        },
      });

      const result = await getUtilizadorContact('usr-1', 'clinica-1');

      expect(result).toEqual({
        phone: '+244923456789',
        jid: '244923456789@s.whatsapp.net',
        name: 'Dr. Maria Santos',
        type: 'utilizador',
        id: 'usr-1',
      });
    });

    it('deve lançar erro quando utilizador não encontrado', async () => {
      (prisma.utilizador.findFirst as any).mockResolvedValue(null);

      await expect(getUtilizadorContact('usr-1', 'clinica-1')).rejects.toThrow(
        ContactNotFoundError
      );
    });
  });

  describe('getContact', () => {
    it('deve chamar getPacienteContact quando tipo é paciente', async () => {
      (prisma.paciente.findFirst as any).mockResolvedValue({
        id: 'pac-1',
        nome: 'João Silva',
        telefone: '923456789',
      });

      await getContact('pac-1', 'paciente', 'clinica-1');

      expect(prisma.paciente.findFirst).toHaveBeenCalled();
    });

    it('deve chamar getUtilizadorContact quando tipo é utilizador', async () => {
      (prisma.utilizador.findFirst as any).mockResolvedValue({
        id: 'usr-1',
        nome: 'Dr. Maria Santos',
        paciente: {
          telefone: '923456789',
        },
      });

      await getContact('usr-1', 'utilizador', 'clinica-1');

      expect(prisma.utilizador.findFirst).toHaveBeenCalled();
    });
  });

  describe('formatGreeting', () => {
    it('deve formatar saudação informal com primeiro nome', () => {
      expect(formatGreeting('João Silva Santos', false)).toBe('Olá, João');
    });

    it('deve formatar saudação formal com primeiro nome', () => {
      expect(formatGreeting('João Silva Santos', true)).toBe('Olá, João');
    });

    it('deve manter tratamento Dr./Dra. quando presente', () => {
      expect(formatGreeting('Dr. João Silva', true)).toBe('Olá, Dr. João Silva');
    });
  });
});
