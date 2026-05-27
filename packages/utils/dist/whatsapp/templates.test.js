"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const templates_1 = require("./templates");
(0, vitest_1.describe)('templates', () => {
    (0, vitest_1.describe)('appointmentReminderTemplate', () => {
        (0, vitest_1.it)('deve gerar mensagem de lembrete 24h antes', () => {
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
            const result = (0, templates_1.appointmentReminderTemplate)(data);
            (0, vitest_1.expect)(result).toContain('João');
            (0, vitest_1.expect)(result).toContain('26 de maio');
            (0, vitest_1.expect)(result).toContain('10:00');
            (0, vitest_1.expect)(result).toContain('Dr. Maria Santos');
            (0, vitest_1.expect)(result).toContain('Cardiologia');
            (0, vitest_1.expect)(result).toContain('Clínica Plus');
            (0, vitest_1.expect)(result).toContain('Rua A, 123');
            (0, vitest_1.expect)(result).toContain('+244923456789');
        });
        (0, vitest_1.it)('deve gerar mensagem de lembrete 2h antes com urgência', () => {
            const data = {
                patientName: 'João Silva',
                appointmentDate: new Date('2026-05-26T10:00:00'),
                appointmentTime: '10:00',
                doctorName: 'Dr. Maria Santos',
                specialty: 'Cardiologia',
                clinicName: 'Clínica Plus',
                hoursBefore: 2,
            };
            const result = (0, templates_1.appointmentReminderTemplate)(data);
            (0, vitest_1.expect)(result).toContain('⚠️');
            (0, vitest_1.expect)(result).toContain('Lembrete Urgente');
            (0, vitest_1.expect)(result).toContain('Confirmar');
            (0, vitest_1.expect)(result).toContain('Cancelar');
        });
    });
    (0, vitest_1.describe)('treatmentUpdateTemplate', () => {
        (0, vitest_1.it)('deve gerar mensagem de atualização de tratamento', () => {
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
            const result = (0, templates_1.treatmentUpdateTemplate)(data);
            (0, vitest_1.expect)(result).toContain('João');
            (0, vitest_1.expect)(result).toContain('Fisioterapia');
            (0, vitest_1.expect)(result).toContain('50%');
            (0, vitest_1.expect)(result).toContain('5/10');
            (0, vitest_1.expect)(result).toContain('26 de maio');
            (0, vitest_1.expect)(result).toContain('14:00');
        });
        (0, vitest_1.it)('deve mostrar parabéns quando progresso 100%', () => {
            const data = {
                patientName: 'João Silva',
                treatmentName: 'Fisioterapia',
                progress: 100,
                doctorName: 'Dr. Maria Santos',
                totalSessions: 10,
                completedSessions: 10,
                clinicName: 'Clínica Plus',
            };
            const result = (0, templates_1.treatmentUpdateTemplate)(data);
            (0, vitest_1.expect)(result).toContain('🎉');
            (0, vitest_1.expect)(result).toContain('tratamento foi concluído');
        });
    });
    (0, vitest_1.describe)('treatmentSessionTemplate', () => {
        (0, vitest_1.it)('deve gerar mensagem de nova sessão agendada', () => {
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
            const result = (0, templates_1.treatmentSessionTemplate)(data);
            (0, vitest_1.expect)(result).toContain('Nova Sessão Agendada');
            (0, vitest_1.expect)(result).toContain('26 de maio');
            (0, vitest_1.expect)(result).toContain('14:00');
            (0, vitest_1.expect)(result).toContain('5/10');
        });
    });
    (0, vitest_1.describe)('paymentReminderTemplate', () => {
        (0, vitest_1.it)('deve gerar mensagem de lembrete de pagamento', () => {
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
            const result = (0, templates_1.paymentReminderTemplate)(data);
            (0, vitest_1.expect)(result).toContain('João');
            (0, vitest_1.expect)(result).toContain('CTR-001');
            (0, vitest_1.expect)(result).toContain('1/12');
            (0, vitest_1.expect)(result).toContain('26 de maio');
            (0, vitest_1.expect)(result).toContain('50');
        });
        (0, vitest_1.it)('deve mostrar aviso de atraso quando overdueDays fornecido', () => {
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
            const result = (0, templates_1.paymentReminderTemplate)(data);
            (0, vitest_1.expect)(result).toContain('⚠️');
            (0, vitest_1.expect)(result).toContain('Pagamento em Atraso');
            (0, vitest_1.expect)(result).toContain('5 dias');
        });
    });
    (0, vitest_1.describe)('paymentConfirmationTemplate', () => {
        (0, vitest_1.it)('deve gerar mensagem de confirmação de pagamento', () => {
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
            const result = (0, templates_1.paymentConfirmationTemplate)(data);
            (0, vitest_1.expect)(result).toContain('✅');
            (0, vitest_1.expect)(result).toContain('Pagamento Confirmado');
            (0, vitest_1.expect)(result).toContain('João');
            (0, vitest_1.expect)(result).toContain('50');
        });
    });
    (0, vitest_1.describe)('welcomeTemplate', () => {
        (0, vitest_1.it)('deve gerar mensagem de boas-vindas', () => {
            const data = {
                patientName: 'João Silva',
                clinicName: 'Clínica Plus',
                clinicPhone: '+244923456789',
                clinicAddress: 'Rua A, 123',
            };
            const result = (0, templates_1.welcomeTemplate)(data);
            (0, vitest_1.expect)(result).toContain('Bem-vindo(a)');
            (0, vitest_1.expect)(result).toContain('Clínica Plus');
            (0, vitest_1.expect)(result).toContain('João');
            (0, vitest_1.expect)(result).toContain('+244923456789');
            (0, vitest_1.expect)(result).toContain('Rua A, 123');
        });
    });
});
//# sourceMappingURL=templates.test.js.map