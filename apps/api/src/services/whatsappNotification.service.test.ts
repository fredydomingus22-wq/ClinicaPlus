import { describe, it, expect, vi, beforeEach } from 'vitest';
import { whatsappNotificationService } from './whatsappNotification.service';
import { evolutionApi } from '../lib/evolutionApi';
import { prisma } from '../lib/prisma';

// Mock evolutionApi
vi.mock('../lib/evolutionApi', () => ({
  evolutionApi: {
    enviarTexto: vi.fn(),
    estadoConexao: vi.fn(),
  },
}));

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    paciente: {
      findFirst: vi.fn(),
    },
    utilizador: {
      findFirst: vi.fn(),
    },
    waInstancia: {
      findFirst: vi.fn(),
    },
  },
}));

describe('whatsappNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendAppointmentReminder', () => {
    it('deve enviar lembrete de agendamento com sucesso', async () => {
      const { prisma } = await import('../lib/prisma');
      const { evolutionApi } = await import('../lib/evolutionApi');

      (prisma.paciente.findFirst as any).mockResolvedValue({
        id: 'pac-1',
        nome: 'João Silva',
        telefone: '923456789',
      });

      (evolutionApi.enviarTexto as any).mockResolvedValue({
        key: { id: 'msg-123' },
      });

      const result = await whatsappNotificationService.sendAppointmentReminder(
        'pac-1',
        'clinica-1',
        {
          patientName: 'João Silva',
          appointmentDate: new Date('2026-05-26T10:00:00'),
          appointmentTime: '10:00',
          doctorName: 'Dr. Maria Santos',
          specialty: 'Cardiologia',
          clinicName: 'Clínica Plus',
          hoursBefore: 24,
        },
        { instanceName: 'test-instance', delay: 1000 }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(evolutionApi.enviarTexto).toHaveBeenCalledWith(
        'test-instance',
        '244923456789@s.whatsapp.net',
        expect.stringContaining('João')
      );
    });

    it('deve retornar erro quando paciente não encontrado', async () => {
      const { prisma } = await import('../lib/prisma');

      (prisma.paciente.findFirst as any).mockResolvedValue(null);

      const result = await whatsappNotificationService.sendAppointmentReminder(
        'pac-1',
        'clinica-1',
        {
          patientName: 'João Silva',
          appointmentDate: new Date('2026-05-26T10:00:00'),
          appointmentTime: '10:00',
          doctorName: 'Dr. Maria Santos',
          specialty: 'Cardiologia',
          clinicName: 'Clínica Plus',
          hoursBefore: 24,
        },
        { instanceName: 'test-instance', delay: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('não encontrado');
    });
  });

  describe('sendTreatmentSession', () => {
    it('deve enviar notificação de sessão de tratamento com sucesso', async () => {
      const { prisma } = await import('../lib/prisma');
      const { evolutionApi } = await import('../lib/evolutionApi');

      (prisma.paciente.findFirst as any).mockResolvedValue({
        id: 'pac-1',
        nome: 'João Silva',
        telefone: '923456789',
      });

      (evolutionApi.enviarTexto as any).mockResolvedValue({
        key: { id: 'msg-456' },
      });

      const result = await whatsappNotificationService.sendTreatmentSession(
        'pac-1',
        'clinica-1',
        {
          patientName: 'João Silva',
          treatmentName: 'Fisioterapia',
          treatmentDescription: 'Reabilitação',
          progress: 50,
          nextSessionDate: new Date('2026-05-26T14:00:00'),
          nextSessionTime: '14:00',
          doctorName: 'Dr. Maria Santos',
          totalSessions: 10,
          completedSessions: 5,
          clinicName: 'Clínica Plus',
        },
        { instanceName: 'test-instance', delay: 1000 }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-456');
    });
  });

  describe('sendPaymentReminder', () => {
    it('deve enviar lembrete de pagamento com sucesso', async () => {
      const { prisma } = await import('../lib/prisma');
      const { evolutionApi } = await import('../lib/evolutionApi');

      (prisma.paciente.findFirst as any).mockResolvedValue({
        id: 'pac-1',
        nome: 'João Silva',
        telefone: '923456789',
      });

      (evolutionApi.enviarTexto as any).mockResolvedValue({
        key: { id: 'msg-789' },
      });

      const result = await whatsappNotificationService.sendPaymentReminder(
        'pac-1',
        'clinica-1',
        {
          patientName: 'João Silva',
          contractNumber: 'CTR-001',
          installmentNumber: 1,
          totalInstallments: 12,
          dueDate: new Date('2026-05-26'),
          amount: 50000,
          currency: 'AOA',
          clinicName: 'Clínica Plus',
          paymentMethods: ['Transferência Bancária'],
        },
        { instanceName: 'test-instance', delay: 1000 }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-789');
    });
  });

  describe('isInstanceConnected', () => {
    it('deve verificar se instância está conectada', async () => {
      const { evolutionApi } = await import('../lib/evolutionApi');

      (evolutionApi.estadoConexao as any).mockResolvedValue({
        instance: { state: 'open' },
      });

      const connected = await whatsappNotificationService.isInstanceConnected('test-instance');

      expect(connected).toBe(true);
      expect(evolutionApi.estadoConexao).toHaveBeenCalledWith('test-instance');
    });

    it('deve retornar false quando instância não está conectada', async () => {
      const { evolutionApi } = await import('../lib/evolutionApi');

      (evolutionApi.estadoConexao as any).mockResolvedValue({
        instance: { state: 'close' },
      });

      const connected = await whatsappNotificationService.isInstanceConnected('test-instance');

      expect(connected).toBe(false);
    });
  });

  describe('getActiveInstance', () => {
    it('deve retornar nome da instância ativa da clínica', async () => {
      const { prisma } = await import('../lib/prisma');

      (prisma.waInstancia.findFirst as any).mockResolvedValue({
        evolutionName: 'test-instance',
        estado: 'CONNECTED',
      });

      const instance = await whatsappNotificationService.getActiveInstance('clinica-1');

      expect(instance).toBe('test-instance');
    });

    it('deve retornar null quando não há instância ativa', async () => {
      const { prisma } = await import('../lib/prisma');

      (prisma.waInstancia.findFirst as any).mockResolvedValue(null);

      const instance = await whatsappNotificationService.getActiveInstance('clinica-1');

      expect(instance).toBeNull();
    });
  });
});
