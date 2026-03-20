import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../lib/prisma';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null })
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: mockSend,
    };
  },
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    contactoClinica: {
      findMany: vi.fn(),
    },
  },
}));

// We need to import the service AFTER mocking Resend if it's initialized at module level
import { notificationService } from '../../services/notification.service';

describe('notification.service', () => {
  const mockData = {
    pacienteEmail: 'patient@test.com',
    pacienteNome: 'João Silva',
    medicoNome: 'Dr. Teste',
    clinicaNome: 'Clínica Central',
    dataHora: new Date(),
    tipo: 'CONSULTA',
    clinicaId: 'c1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendConfirmacaoAgendamento', () => {
    it('sends an email when patient has an email address', async () => {
      vi.mocked(prisma.contactoClinica.findMany).mockResolvedValue([]);
      
      await notificationService.sendConfirmacaoAgendamento(mockData);

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'patient@test.com',
        subject: expect.stringContaining('Confirmado'),
      }));
    });

    it('skips sending email when patientEmail is missing', async () => {
      await notificationService.sendConfirmacaoAgendamento({ ...mockData, pacienteEmail: '' });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('continues sending even if contacts fetch fails', async () => {
      vi.mocked(prisma.contactoClinica.findMany).mockRejectedValue(new Error('DB Error'));
      
      await expect(notificationService.sendConfirmacaoAgendamento(mockData)).resolves.toBeUndefined();
      
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('sendResetPassword', () => {
    it('sends reset email with correct URL', async () => {
      const resetData = {
        email: 'user@test.com',
        nome: 'Utilizador',
        resetUrl: 'http://localhost:5173/reset-password?token=token123',
        expiresInMinutes: 15
      };

      await notificationService.sendResetPassword(resetData);

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'user@test.com',
        html: expect.stringContaining('token123'),
      }));
    });
  });
});
