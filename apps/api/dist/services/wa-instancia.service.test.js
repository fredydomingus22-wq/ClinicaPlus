"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_mock_1 = require("../test/mocks/prisma.mock");
const evolutionApi_mock_1 = require("../test/mocks/evolutionApi.mock");
const client_1 = require("@prisma/client");
const types_1 = require("@clinicaplus/types");
const wa_instancia_service_1 = require("./wa-instancia.service");
const eventBus_1 = require("../lib/eventBus");
// 1. Mock do config
vitest_1.vi.mock('../lib/config', () => ({
    config: {
        API_PUBLIC_URL: 'https://api.test',
        EVOLUTION_WEBHOOK_SECRET: 'secret'
    }
}));
// 2. Mock do eventBus
vitest_1.vi.mock('../lib/eventBus', () => ({
    publishEvent: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('waInstanciaService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('criar', () => {
        (0, vitest_1.it)('deve criar instância na Evolution API com nome gerado', async () => {
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({
                id: 'clinica-1',
                nome: 'Clínica Plus',
                slug: 'clinica-plus',
                email: 'test@clinica.plus',
                plano: client_1.Plano.PRO,
                ativo: true,
                subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                logo: null,
                telefone: null,
                endereco: null,
                cidade: null,
                provincia: null,
                subscricaoValidaAte: null
            });
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue(null);
            prisma_mock_1.mockPrisma.waInstancia.create.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.criar('clinica-1', 'user-1');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.criarInstancia).toHaveBeenCalledWith(vitest_1.expect.stringMatching(/^cp-clinica-plus-[0-9a-f]{6}$/), vitest_1.expect.stringMatching(/\/webhook\/whatsapp$/));
        });
        (0, vitest_1.it)('deve persistir instância no DB com estado AGUARDA_QR', async () => {
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({
                id: 'clinica-1',
                nome: 'Clínica Plus',
                slug: 'clinica-plus',
                email: 'test@clinica.plus',
                plano: client_1.Plano.PRO,
                ativo: true,
                subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                logo: null,
                telefone: null,
                endereco: null,
                cidade: null,
                provincia: null,
                subscricaoValidaAte: null
            });
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue(null);
            await wa_instancia_service_1.waInstanciaService.criar('clinica-1', 'user-1');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    clinicaId: 'clinica-1',
                    evolutionName: vitest_1.expect.stringMatching(/^cp-clinica-plus-[0-9a-f]{6}$/),
                    evolutionToken: vitest_1.expect.any(String),
                    estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                })
            }));
        });
        (0, vitest_1.it)('deve falhar se clínica já tem instância activa', async () => {
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({
                id: 'clinica-1',
                nome: 'Clínica Plus',
                slug: 'clinica-plus',
                email: 'test@clinica.plus',
                plano: client_1.Plano.PRO,
                ativo: true,
                subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                logo: null,
                telefone: null,
                endereco: null,
                cidade: null,
                provincia: null,
                subscricaoValidaAte: null
            });
            prisma_mock_1.mockPrisma.waInstancia.findFirst.mockResolvedValueOnce({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.criar('clinica-1', 'user-1')).rejects.toThrow();
        });
        (0, vitest_1.it)('deve falhar se plano não é PRO ou ENTERPRISE', async () => {
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({
                id: 'clinica-1',
                nome: 'Clínica Plus',
                slug: 'clinica-plus',
                email: 'test@clinica.plus',
                plano: client_1.Plano.BASICO,
                ativo: true,
                subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                logo: null,
                telefone: null,
                endereco: null,
                cidade: null,
                provincia: null,
                subscricaoValidaAte: null
            });
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue(null);
            await (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.criar('clinica-1', 'user-1')).rejects.toThrow();
        });
        (0, vitest_1.it)('deve configurar webhook URL correcta na Evolution API', async () => {
            prisma_mock_1.mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({
                id: 'clinica-1',
                nome: 'Clínica Plus',
                slug: 'clinica-plus',
                email: 'test@clinica.plus',
                plano: client_1.Plano.PRO,
                ativo: true,
                subscricaoEstado: types_1.EstadoSubscricao.ACTIVA,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                logo: null,
                telefone: null,
                endereco: null,
                cidade: null,
                provincia: null,
                subscricaoValidaAte: null
            });
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue(null);
            await wa_instancia_service_1.waInstanciaService.criar('clinica-1', 'user-1');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.criarInstancia).toHaveBeenCalledWith(vitest_1.expect.stringMatching(/^cp-clinica-plus-[0-9a-f]{6}$/), vitest_1.expect.stringMatching(/\/webhook\/whatsapp$/));
        });
    });
    (0, vitest_1.describe)('processarQrCode', () => {
        (0, vitest_1.it)('deve guardar qrCodeBase64 no DB quando recebe QRCODE_UPDATED', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.processarQrCode('clinica-1', 'base64-test');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'ins-1' },
                data: vitest_1.expect.objectContaining({ qrCodeBase64: 'base64-test', estado: client_1.WaEstadoInstancia.AGUARDA_QR })
            }));
        });
        (0, vitest_1.it)('deve publicar evento whatsapp:qrcode via WebSocket', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.processarQrCode('clinica-1', 'base64-test');
            (0, vitest_1.expect)(eventBus_1.publishEvent).toHaveBeenCalledWith('clinica:clinica-1', 'whatsapp:qrcode', { instanciaId: 'ins-1', qrCodeBase64: 'base64-test' });
        });
    });
    (0, vitest_1.describe)('processarConexao', () => {
        (0, vitest_1.it)('deve actualizar estado para CONECTADO quando state=open', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.processarConexao('clinica-1', 'open');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'ins-1' },
                data: vitest_1.expect.objectContaining({ estado: client_1.WaEstadoInstancia.CONECTADO, qrCodeBase64: null })
            }));
        });
        (0, vitest_1.it)('deve actualizar estado para DESCONECTADO quando state=close', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.CONECTADO,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.processarConexao('clinica-1', 'close');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'ins-1' },
                data: vitest_1.expect.objectContaining({ estado: client_1.WaEstadoInstancia.DESCONECTADO, qrCodeBase64: null })
            }));
        });
        (0, vitest_1.it)('deve limpar qrCodeBase64 quando CONECTADO', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.processarConexao('clinica-1', 'open');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'ins-1' },
                data: vitest_1.expect.objectContaining({ estado: client_1.WaEstadoInstancia.CONECTADO, qrCodeBase64: null })
            }));
        });
        (0, vitest_1.it)('deve publicar evento whatsapp:estado via WebSocket', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findUnique.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.AGUARDA_QR,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.processarConexao('clinica-1', 'open');
            (0, vitest_1.expect)(eventBus_1.publishEvent).toHaveBeenCalledWith('clinica:clinica-1', 'whatsapp:estado', { instanciaId: 'ins-1', estado: client_1.WaEstadoInstancia.CONECTADO });
        });
    });
    (0, vitest_1.describe)('desligar', () => {
        (0, vitest_1.it)('deve fazer logout na Evolution API e actualizar DB para DESCONECTADO', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findFirst.mockResolvedValue({
                id: 'ins-1',
                clinicaId: 'clinica-1',
                evolutionName: 'cp-clinica-1-prod',
                evolutionToken: 'token-123',
                estado: client_1.WaEstadoInstancia.CONECTADO,
                numeroTelefone: null,
                qrCodeBase64: null,
                criadoEm: new Date(),
                atualizadoEm: new Date(),
                qrExpiresAt: null
            });
            await wa_instancia_service_1.waInstanciaService.desligar('clinica-1', 'user-1');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.desligar).toHaveBeenCalledWith('cp-clinica-1-prod');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'ins-1' },
                data: vitest_1.expect.objectContaining({ estado: client_1.WaEstadoInstancia.DESCONECTADO, qrCodeBase64: null })
            }));
        });
    });
    (0, vitest_1.describe)('eliminar', () => {
        const mockInstancia = {
            id: 'ins-1',
            clinicaId: 'clinica-1',
            evolutionName: 'cp-clinica-1-prod',
            evolutionToken: 'token-123',
            estado: client_1.WaEstadoInstancia.CONECTADO,
            numeroTelefone: '+244923456789',
            qrCodeBase64: null,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
            qrExpiresAt: null
        };
        (0, vitest_1.it)('deve eliminar instância na Evolution API e no DB', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findFirst.mockResolvedValue(mockInstancia);
            evolutionApi_mock_1.mockEvolutionApi.eliminar.mockResolvedValue(undefined);
            prisma_mock_1.mockPrisma.waInstancia.delete.mockResolvedValue(mockInstancia);
            await wa_instancia_service_1.waInstanciaService.eliminar('ins-1', 'clinica-1');
            (0, vitest_1.expect)(evolutionApi_mock_1.mockEvolutionApi.eliminar).toHaveBeenCalledWith('cp-clinica-1-prod');
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.delete).toHaveBeenCalledWith({
                where: { id: 'ins-1' }
            });
        });
        (0, vitest_1.it)('deve eliminar do DB mesmo se Evolution API falhar', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findFirst.mockResolvedValue(mockInstancia);
            evolutionApi_mock_1.mockEvolutionApi.eliminar.mockRejectedValue(new Error('Evolution API offline'));
            prisma_mock_1.mockPrisma.waInstancia.delete.mockResolvedValue(mockInstancia);
            await wa_instancia_service_1.waInstanciaService.eliminar('ins-1', 'clinica-1');
            // Deve continuar e fazer delete no DB mesmo que Evolution falhe
            (0, vitest_1.expect)(prisma_mock_1.mockPrisma.waInstancia.delete).toHaveBeenCalledWith({
                where: { id: 'ins-1' }
            });
        });
        (0, vitest_1.it)('deve lançar erro se instância não pertence à clínica', async () => {
            prisma_mock_1.mockPrisma.waInstancia.findFirst.mockResolvedValue(null);
            await (0, vitest_1.expect)(wa_instancia_service_1.waInstanciaService.eliminar('ins-1', 'clinica-errada')).rejects.toThrow();
        });
    });
});
