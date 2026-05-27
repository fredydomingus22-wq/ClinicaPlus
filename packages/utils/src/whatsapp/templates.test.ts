import { describe, it, expect } from 'vitest';
import {
  appointmentReminderTemplate,
  treatmentUpdateTemplate,
  treatmentSessionTemplate,
  paymentReminderTemplate,
  paymentConfirmationTemplate,
  welcomeTemplate,
} from './templates';

describe('templates', () => {
  describe('appointmentReminderTemplate', () => {
    it('deve gerar mensagem de lembrete 24h antes', () => {
      const data = {
        patientName: 'João Silva',
        appointmentDate: new Date('2026-05-26T10:00:00'),
        appointmentTime: '10:00',
        doctorName: 'Dr. Maria Santos',
        specialty: 'Cardiologia',
        clinicName: 'Clínica Plus',
        clinicAddress: 'Rua A, 123',
        clinicPhone: '+244923456789',
        hoursBefore: 24,
      };

      const result = appointmentReminderTemplate(data);

      expect(result).toContain('João');
      expect(result).toContain('26 de maio');
      expect(result).toContain('10:00');
      expect(result).toContain('Dr. Maria Santos');
      expect(result).toContain('Cardiologia');
      expect(result).toContain('Clínica Plus');
      expect(result).toContain('Rua A, 123');
      expect(result).toContain('+244923456789');
    });

    it('deve gerar mensagem de lembrete 2h antes com urgência', () => {
      const data = {
        patientName: 'João Silva',
        appointmentDate: new Date('2026-05-26T10:00:00'),
        appointmentTime: '10:00',
        doctorName: 'Dr. Maria Santos',
        specialty: 'Cardiologia',
        clinicName: 'Clínica Plus',
        hoursBefore: 2,
      };

      const result = appointmentReminderTemplate(data);

      expect(result).toContain('⚠️');
      expect(result).toContain('Lembrete Urgente');
      expect(result).toContain('Confirmar');
      expect(result).toContain('Cancelar');
    });
  });

  describe('treatmentUpdateTemplate', () => {
    it('deve gerar mensagem de atualização de tratamento', () => {
      const data = {
        patientName: 'João Silva',
        treatmentName: 'Fisioterapia',
        treatmentDescription: 'Reabilitação de ombro',
        progress: 50,
        nextSessionDate: new Date('2026-05-26T14:00:00'),
        nextSessionTime: '14:00',
        doctorName: 'Dr. Maria Santos',
        totalSessions: 10,
        completedSessions: 5,
        clinicName: 'Clínica Plus',
      };

      const result = treatmentUpdateTemplate(data);

      expect(result).toContain('João');
      expect(result).toContain('Fisioterapia');
      expect(result).toContain('50%');
      expect(result).toContain('5/10');
      expect(result).toContain('26 de maio');
      expect(result).toContain('14:00');
    });

    it('deve mostrar parabéns quando progresso 100%', () => {
      const data = {
        patientName: 'João Silva',
        treatmentName: 'Fisioterapia',
        progress: 100,
        doctorName: 'Dr. Maria Santos',
        totalSessions: 10,
        completedSessions: 10,
        clinicName: 'Clínica Plus',
      };

      const result = treatmentUpdateTemplate(data);

      expect(result).toContain('🎉');
      expect(result).toContain('tratamento foi concluído');
    });
  });

  describe('treatmentSessionTemplate', () => {
    it('deve gerar mensagem de nova sessão agendada', () => {
      const data = {
        patientName: 'João Silva',
        treatmentName: 'Fisioterapia',
        treatmentDescription: 'Reabilitação de ombro',
        progress: 50,
        nextSessionDate: new Date('2026-05-26T14:00:00'),
        nextSessionTime: '14:00',
        doctorName: 'Dr. Maria Santos',
        totalSessions: 10,
        completedSessions: 5,
        clinicName: 'Clínica Plus',
      };

      const result = treatmentSessionTemplate(data);

      expect(result).toContain('Nova Sessão Agendada');
      expect(result).toContain('26 de maio');
      expect(result).toContain('14:00');
      expect(result).toContain('5/10');
    });
  });

  describe('paymentReminderTemplate', () => {
    it('deve gerar mensagem de lembrete de pagamento', () => {
      const data = {
        patientName: 'João Silva',
        contractNumber: 'CTR-001',
        installmentNumber: 1,
        totalInstallments: 12,
        dueDate: new Date('2026-05-26'),
        amount: 50000,
        currency: 'AOA',
        clinicName: 'Clínica Plus',
        paymentMethods: ['Transferência Bancária', 'Multicaixo'],
      };

      const result = paymentReminderTemplate(data);

      expect(result).toContain('João');
      expect(result).toContain('CTR-001');
      expect(result).toContain('1/12');
      expect(result).toContain('26 de maio');
      expect(result).toContain('50');
    });

    it('deve mostrar aviso de atraso quando overdueDays fornecido', () => {
      const data = {
        patientName: 'João Silva',
        contractNumber: 'CTR-001',
        installmentNumber: 1,
        totalInstallments: 12,
        dueDate: new Date('2026-05-20'),
        amount: 50000,
        currency: 'AOA',
        clinicName: 'Clínica Plus',
        paymentMethods: ['Transferência Bancária'],
        overdueDays: 5,
      };

      const result = paymentReminderTemplate(data);

      expect(result).toContain('⚠️');
      expect(result).toContain('Pagamento em Atraso');
      expect(result).toContain('5 dias');
    });
  });

  describe('paymentConfirmationTemplate', () => {
    it('deve gerar mensagem de confirmação de pagamento', () => {
      const data = {
        patientName: 'João Silva',
        contractNumber: 'CTR-001',
        installmentNumber: 1,
        totalInstallments: 12,
        dueDate: new Date('2026-05-26'),
        amount: 50000,
        currency: 'AOA',
        clinicName: 'Clínica Plus',
        paymentMethods: [],
      };

      const result = paymentConfirmationTemplate(data);

      expect(result).toContain('✅');
      expect(result).toContain('Pagamento Confirmado');
      expect(result).toContain('João');
      expect(result).toContain('50');
    });
  });

  describe('welcomeTemplate', () => {
    it('deve gerar mensagem de boas-vindas', () => {
      const data = {
        patientName: 'João Silva',
        clinicName: 'Clínica Plus',
        clinicPhone: '+244923456789',
        clinicAddress: 'Rua A, 123',
      };

      const result = welcomeTemplate(data);

      expect(result).toContain('Bem-vindo(a)');
      expect(result).toContain('Clínica Plus');
      expect(result).toContain('João');
      expect(result).toContain('+244923456789');
      expect(result).toContain('Rua A, 123');
    });
  });
});
