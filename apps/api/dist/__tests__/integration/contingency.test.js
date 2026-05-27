"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../lib/prisma");
const factories_1 = require("../helpers/factories");
const faturas_service_1 = require("../../services/faturas.service");
const ContingencySyncService_1 = require("../../services/fiscal/ContingencySyncService");
const AgtApiClient_1 = require("../../services/fiscal/AgtApiClient");
const client_1 = require("@prisma/client");
const types_1 = require("@clinicaplus/types");
(0, vitest_1.describe)('Contingency Failover & Synchronization (Decreto 71/25)', () => {
    let ctx;
    (0, vitest_1.beforeAll)(async () => {
        ctx = await factories_1.factories.setupClinicaCompleta();
    });
    (0, vitest_1.afterAll)(async () => {
        vitest_1.vi.restoreAllMocks();
        if (ctx) {
            await factories_1.factories.cleanupClinica(ctx.clinica.id);
        }
    });
    (0, vitest_1.it)('1. Deve activar contingência automaticamente ao encontrar falha de rede/timeout na AGT', async () => {
        // Criar fatura rascunho
        const faturaDTO = await faturas_service_1.faturasService.create({
            pacienteId: ctx.paciente.id,
            tipo: types_1.TipoFatura.PARTICULAR,
            tipoDocFiscal: types_1.TipoDocumentoFiscal.FT,
            desconto: 0,
            retencaoFonte: 0,
            retrodatar: false,
            itens: [
                { descricao: 'Consulta Geral', quantidade: 1, precoUnit: 15000, desconto: 0, taxaIva: 0, codigoIva: 'ISE' },
            ],
        }, ctx.clinica.id, ctx.admin.id);
        // Mockar erro de timeout de rede na AGT
        const registarFacturaSpy = vitest_1.vi.spyOn(AgtApiClient_1.agtApiClient, 'registarFactura').mockRejectedValue({
            code: 'ETIMEDOUT',
            message: 'Connection timed out',
        });
        // Emitir a fatura - deve emitir inicialmente como PENDENTE
        const emitida = await faturas_service_1.faturasService.emitir(faturaDTO.id, ctx.clinica.id, ctx.admin.id);
        (0, vitest_1.expect)(emitida.estado).toBe(client_1.EstadoFatura.EMITIDA);
        // Chamar submissão explicitamente e aguardar o tratamento do erro
        await faturas_service_1.faturasService.submeterParaAgt(faturaDTO.id, ctx.clinica.id);
        (0, vitest_1.expect)(registarFacturaSpy).toHaveBeenCalledTimes(1);
        // Verificar se a fatura foi marcada em contingência
        const faturaDb = await prisma_1.prisma.fatura.findUnique({
            where: { id: faturaDTO.id },
        });
        (0, vitest_1.expect)(faturaDb?.emContingencia).toBe(true);
        (0, vitest_1.expect)(faturaDb?.statusEnvio).toBe('CONTINGENCIA');
        // Verificar se a sequência foi colocada em contingência
        const seq = await prisma_1.prisma.sequenciaDocFiscal.findFirst({
            where: {
                clinicaId: ctx.clinica.id,
                serie: ctx.clinica.serieDocFiscal || 'TEST',
                isContingency: true,
                endTS: null,
            },
        });
        (0, vitest_1.expect)(seq).not.toBeNull();
        (0, vitest_1.expect)(seq?.startTS).toBeInstanceOf(Date);
        (0, vitest_1.expect)(seq?.isRegistered).toBe(false);
        // Verificar se foi gerado o evento de aviso no sistema
        const evento = await prisma_1.prisma.sistemaEvento.findFirst({
            where: {
                clinicaId: ctx.clinica.id,
                tipo: 'API_ERROR',
                severidade: 'WARN',
            },
        });
        (0, vitest_1.expect)(evento).not.toBeNull();
        (0, vitest_1.expect)(evento?.mensagem).toContain('colocada em fila de contingência');
        registarFacturaSpy.mockRestore();
    });
    (0, vitest_1.it)('2. Faturas seguintes devem usar a série de contingência (CPLSC) diretamente e não tentar submissão em tempo real', async () => {
        // Criar uma segunda fatura rascunho
        const faturaDTO2 = await faturas_service_1.faturasService.create({
            pacienteId: ctx.paciente.id,
            tipo: types_1.TipoFatura.PARTICULAR,
            tipoDocFiscal: types_1.TipoDocumentoFiscal.FT,
            desconto: 0,
            retencaoFonte: 0,
            retrodatar: false,
            itens: [
                { descricao: 'Exame de Sangue', quantidade: 1, precoUnit: 8000, desconto: 0, taxaIva: 0, codigoIva: 'ISE' },
            ],
        }, ctx.clinica.id, ctx.admin.id);
        // Espionar para garantir que não tenta enviar em tempo real para a AGT
        const registarFacturaSpy = vitest_1.vi.spyOn(AgtApiClient_1.agtApiClient, 'registarFactura');
        // Emitir a fatura sob contingência activa
        const emitida2 = await faturas_service_1.faturasService.emitir(faturaDTO2.id, ctx.clinica.id, ctx.admin.id);
        // Não deve tentar registar em tempo real
        (0, vitest_1.expect)(registarFacturaSpy).not.toHaveBeenCalled();
        // Deve usar a série de contingência (com sufixo C)
        const expectedSerie = `${ctx.clinica.serieDocFiscal || 'TEST'}C`;
        (0, vitest_1.expect)(emitida2.serieDocFiscal).toBe(expectedSerie);
        (0, vitest_1.expect)(emitida2.numeroFatura).toContain(expectedSerie);
        (0, vitest_1.expect)(emitida2.emContingencia).toBe(true);
        (0, vitest_1.expect)(emitida2.statusEnvio).toBe('CONTINGENCIA');
        registarFacturaSpy.mockRestore();
    });
    (0, vitest_1.it)('3. ContingencySyncService deve registrar a série com solicitarSerie, submeter em lote, e sair da contingência gracefully', async () => {
        // Mock de sucesso para solicitarSerie
        const solicitarSerieSpy = vitest_1.vi.spyOn(AgtApiClient_1.agtApiClient, 'solicitarSerie').mockResolvedValue({
            resultCode: 1,
            seriesFEResult: {
                seriesCode: 'TESTC-SR',
                authorizedQuantity: '1000',
                firstDocumentNo: '1',
                lastDocumentNo: '1000',
            },
        });
        // Mock de sucesso para registarFactura + validação assíncrona
        const registarFacturaSpy = vitest_1.vi.spyOn(AgtApiClient_1.agtApiClient, 'registarFactura').mockResolvedValue({
            requestID: 'SUCCESS-REQ-ID',
            documentStatusList: [],
        });
        const obterEstadoSpy = vitest_1.vi.spyOn(AgtApiClient_1.agtApiClient, 'obterEstado').mockResolvedValue({
            requestID: 'SUCCESS-REQ-ID',
            resultCode: '0',
            taxRegistrationNumber: ctx.clinica.nif || '999999999',
            documentStatusList: [],
        });
        // Executar a sincronização da clínica
        await ContingencySyncService_1.contingencySyncService.syncPendingDocuments(ctx.clinica.id);
        // Deve ter chamado registrar série na AGT com o indicador 'C'
        (0, vitest_1.expect)(solicitarSerieSpy).toHaveBeenCalledTimes(1);
        const firstCall = solicitarSerieSpy.mock.calls[0];
        if (!firstCall)
            throw new Error('solicitarSerie não foi chamado');
        const solicitarSerieArgs = firstCall[0];
        (0, vitest_1.expect)(solicitarSerieArgs.seriesContingencyIndicator).toBe('C');
        (0, vitest_1.expect)(solicitarSerieArgs.seriesStartTS).toBeDefined();
        (0, vitest_1.expect)(solicitarSerieArgs.seriesEndTS).toBeDefined();
        // Deve ter registado as faturas acumuladas na AGT
        (0, vitest_1.expect)(registarFacturaSpy).toHaveBeenCalled();
        // Verificar se as sequências de contingência foram marcadas como registadas
        const sequencias = await prisma_1.prisma.sequenciaDocFiscal.findMany({
            where: { clinicaId: ctx.clinica.id },
        });
        // Todas as sequências activas de contingência devem ter sido encerradas
        const activeContingencies = sequencias.filter(s => s.isContingency && s.endTS === null);
        (0, vitest_1.expect)(activeContingencies.length).toBe(0);
        // E a sequência usada deve estar registada
        const contingenciaReg = sequencias.find(s => s.serie === `${ctx.clinica.serieDocFiscal || 'TEST'}C`);
        (0, vitest_1.expect)(contingenciaReg?.isRegistered).toBe(true);
        (0, vitest_1.expect)(contingenciaReg?.isContingency).toBe(false); // Virou inactivo após sync total
        // Verificar se os status das faturas mudaram para ENTREGUE
        const faturas = await prisma_1.prisma.fatura.findMany({
            where: { clinicaId: ctx.clinica.id },
        });
        for (const f of faturas) {
            (0, vitest_1.expect)(f.statusEnvio).toBe('ENTREGUE');
        }
        solicitarSerieSpy.mockRestore();
        registarFacturaSpy.mockRestore();
        obterEstadoSpy.mockRestore();
    });
});
