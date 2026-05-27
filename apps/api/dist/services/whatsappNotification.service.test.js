"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const whatsappNotification_service_1 = require("./whatsappNotification.service");
// Mock evolutionApi
vitest_1.vi.mock('../lib/evolutionApi', () => ({
    evolutionApi: {
        enviarTexto: vitest_1.vi.fn(),
        estadoConexao: vitest_1.vi.fn(),
    },
}));
// Mock prisma
vitest_1.vi.mock('../lib/prisma', () => ({
    prisma: {
        paciente: {
            findFirst: vitest_1.vi.fn(),
        },
        utilizador: {
            findFirst: vitest_1.vi.fn(),
        },
        waInstancia: {
            findFirst: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('whatsappNotificationService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('sendAppointmentReminder', () => {
        (0, vitest_1.it)('deve enviar lembrete de agendamento com sucesso', async () => {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            const { evolutionApi } = await Promise.resolve().then(() => __importStar(require('../lib/evolutionApi')));
            prisma.paciente.findFirst.mockResolvedValue({
                id: 'pac-1',
                nome: 'João Silva',
                telefone: '923456789',
            });
            evolutionApi.enviarTexto.mockResolvedValue({
                key: { id: 'msg-123' },
            });
            const result = await whatsappNotification_service_1.whatsappNotificationService.sendAppointmentReminder('pac-1', 'clinica-1', {
                patientName: 'João Silva',
                appointmentDate: new Date('2026-05-26T10:00:00'),
                appointmentTime: '10:00',
                doctorName: 'Dr. Maria Santos',
                specialty: 'Cardiologia',
                clinicName: 'Clínica Plus',
                hoursBefore: 24,
            }, { instanceName: 'test-instance', delay: 1000 });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.messageId).toBe('msg-123');
            (0, vitest_1.expect)(evolutionApi.enviarTexto).toHaveBeenCalledWith('test-instance', '244923456789@s.whatsapp.net', vitest_1.expect.stringContaining('João'));
        });
        (0, vitest_1.it)('deve retornar erro quando paciente não encontrado', async () => {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            prisma.paciente.findFirst.mockResolvedValue(null);
            const result = await whatsappNotification_service_1.whatsappNotificationService.sendAppointmentReminder('pac-1', 'clinica-1', {
                patientName: 'João Silva',
                appointmentDate: new Date('2026-05-26T10:00:00'),
                appointmentTime: '10:00',
                doctorName: 'Dr. Maria Santos',
                specialty: 'Cardiologia',
                clinicName: 'Clínica Plus',
                hoursBefore: 24,
            }, { instanceName: 'test-instance', delay: 1000 });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('não encontrado');
        });
    });
    (0, vitest_1.describe)('sendTreatmentSession', () => {
        (0, vitest_1.it)('deve enviar notificação de sessão de tratamento com sucesso', async () => {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            const { evolutionApi } = await Promise.resolve().then(() => __importStar(require('../lib/evolutionApi')));
            prisma.paciente.findFirst.mockResolvedValue({
                id: 'pac-1',
                nome: 'João Silva',
                telefone: '923456789',
            });
            evolutionApi.enviarTexto.mockResolvedValue({
                key: { id: 'msg-456' },
            });
            const result = await whatsappNotification_service_1.whatsappNotificationService.sendTreatmentSession('pac-1', 'clinica-1', {
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
            }, { instanceName: 'test-instance', delay: 1000 });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.messageId).toBe('msg-456');
        });
    });
    (0, vitest_1.describe)('sendPaymentReminder', () => {
        (0, vitest_1.it)('deve enviar lembrete de pagamento com sucesso', async () => {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            const { evolutionApi } = await Promise.resolve().then(() => __importStar(require('../lib/evolutionApi')));
            prisma.paciente.findFirst.mockResolvedValue({
                id: 'pac-1',
                nome: 'João Silva',
                telefone: '923456789',
            });
            evolutionApi.enviarTexto.mockResolvedValue({
                key: { id: 'msg-789' },
            });
            const result = await whatsappNotification_service_1.whatsappNotificationService.sendPaymentReminder('pac-1', 'clinica-1', {
                patientName: 'João Silva',
                contractNumber: 'CTR-001',
                installmentNumber: 1,
                totalInstallments: 12,
                dueDate: new Date('2026-05-26'),
                amount: 50000,
                currency: 'AOA',
                clinicName: 'Clínica Plus',
                paymentMethods: ['Transferência Bancária'],
            }, { instanceName: 'test-instance', delay: 1000 });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.messageId).toBe('msg-789');
        });
    });
    (0, vitest_1.describe)('isInstanceConnected', () => {
        (0, vitest_1.it)('deve verificar se instância está conectada', async () => {
            const { evolutionApi } = await Promise.resolve().then(() => __importStar(require('../lib/evolutionApi')));
            evolutionApi.estadoConexao.mockResolvedValue({
                instance: { state: 'open' },
            });
            const connected = await whatsappNotification_service_1.whatsappNotificationService.isInstanceConnected('test-instance');
            (0, vitest_1.expect)(connected).toBe(true);
            (0, vitest_1.expect)(evolutionApi.estadoConexao).toHaveBeenCalledWith('test-instance');
        });
        (0, vitest_1.it)('deve retornar false quando instância não está conectada', async () => {
            const { evolutionApi } = await Promise.resolve().then(() => __importStar(require('../lib/evolutionApi')));
            evolutionApi.estadoConexao.mockResolvedValue({
                instance: { state: 'close' },
            });
            const connected = await whatsappNotification_service_1.whatsappNotificationService.isInstanceConnected('test-instance');
            (0, vitest_1.expect)(connected).toBe(false);
        });
    });
    (0, vitest_1.describe)('getActiveInstance', () => {
        (0, vitest_1.it)('deve retornar nome da instância ativa da clínica', async () => {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            prisma.waInstancia.findFirst.mockResolvedValue({
                evolutionName: 'test-instance',
                estado: 'CONNECTED',
            });
            const instance = await whatsappNotification_service_1.whatsappNotificationService.getActiveInstance('clinica-1');
            (0, vitest_1.expect)(instance).toBe('test-instance');
        });
        (0, vitest_1.it)('deve retornar null quando não há instância ativa', async () => {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
            prisma.waInstancia.findFirst.mockResolvedValue(null);
            const instance = await whatsappNotification_service_1.whatsappNotificationService.getActiveInstance('clinica-1');
            (0, vitest_1.expect)(instance).toBeNull();
        });
    });
});
