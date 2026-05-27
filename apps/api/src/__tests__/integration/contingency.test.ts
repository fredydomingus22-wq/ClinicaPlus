import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../lib/prisma';
import { factories } from '../helpers/factories';
import { faturasService } from '../../services/faturas.service';
import { contingencySyncService } from '../../services/fiscal/ContingencySyncService';
import { agtApiClient } from '../../services/fiscal/AgtApiClient';
import { EstadoFatura } from '@prisma/client';
import { TipoFatura, TipoDocumentoFiscal, TipoItemFatura } from '@clinicaplus/types';

describe('Contingency Failover & Synchronization (Decreto 71/25)', () => {
  let ctx: Awaited<ReturnType<typeof factories.setupClinicaCompleta>>;

  beforeAll(async () => {
    ctx = await factories.setupClinicaCompleta();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (ctx) {
      await factories.cleanupClinica(ctx.clinica.id);
    }
  });

  it('1. Deve activar contingência automaticamente ao encontrar falha de rede/timeout na AGT', async () => {
    // Criar fatura rascunho
    const faturaDTO = await faturasService.create(
      {
        pacienteId: ctx.paciente.id,
        tipo: TipoFatura.PARTICULAR,
        tipoDocFiscal: TipoDocumentoFiscal.FT,
        desconto: 0,
        retencaoFonte: 0,
        retrodatar: false,
        itens: [
          { tipoItem: TipoItemFatura.SERVICO, descricao: 'Consulta Geral', quantidade: 1, precoUnit: 15000, desconto: 0, taxaIva: 0, codigoIva: 'ISE' },
        ],
      },
      ctx.clinica.id,
      ctx.admin.id
    );

    // Mockar erro de timeout de rede na AGT
    const registarFacturaSpy = vi.spyOn(agtApiClient, 'registarFactura').mockRejectedValue({
      code: 'ETIMEDOUT',
      message: 'Connection timed out',
    });

    // Emitir a fatura - deve emitir inicialmente como PENDENTE
    const emitida = await faturasService.emitir(faturaDTO.id, ctx.clinica.id, ctx.admin.id);
    expect(emitida.estado).toBe(EstadoFatura.EMITIDA);

    // Chamar submissão explicitamente e aguardar o tratamento do erro
    await faturasService.submeterParaAgt(faturaDTO.id, ctx.clinica.id);

    expect(registarFacturaSpy).toHaveBeenCalledTimes(1);

    // Verificar se a fatura foi marcada em contingência
    const faturaDb = await prisma.fatura.findUnique({
      where: { id: faturaDTO.id },
    });

    expect(faturaDb?.emContingencia).toBe(true);
    expect(faturaDb?.statusEnvio).toBe('CONTINGENCIA');

    // Verificar se a sequência foi colocada em contingência
    const seq = await prisma.sequenciaDocFiscal.findFirst({
      where: {
        clinicaId: ctx.clinica.id,
        serie: ctx.clinica.serieDocFiscal || 'TEST',
        isContingency: true,
        endTS: null,
      },
    });

    expect(seq).not.toBeNull();
    expect(seq?.startTS).toBeInstanceOf(Date);
    expect(seq?.isRegistered).toBe(false);

    // Verificar se foi gerado o evento de aviso no sistema
    const evento = await prisma.sistemaEvento.findFirst({
      where: {
        clinicaId: ctx.clinica.id,
        tipo: 'API_ERROR',
        severidade: 'WARN',
      },
    });
    expect(evento).not.toBeNull();
    expect(evento?.mensagem).toContain('colocada em fila de contingência');

    registarFacturaSpy.mockRestore();
  });

  it('2. Faturas seguintes devem usar a série de contingência (CPLSC) diretamente e não tentar submissão em tempo real', async () => {
    // Criar uma segunda fatura rascunho
    const faturaDTO2 = await faturasService.create(
      {
        pacienteId: ctx.paciente.id,
        tipo: TipoFatura.PARTICULAR,
        tipoDocFiscal: TipoDocumentoFiscal.FT,
        desconto: 0,
        retencaoFonte: 0,
        retrodatar: false,
        itens: [
          { tipoItem: TipoItemFatura.SERVICO, descricao: 'Exame de Sangue', quantidade: 1, precoUnit: 8000, desconto: 0, taxaIva: 0, codigoIva: 'ISE' },
        ],
      },
      ctx.clinica.id,
      ctx.admin.id
    );

    // Espionar para garantir que não tenta enviar em tempo real para a AGT
    const registarFacturaSpy = vi.spyOn(agtApiClient, 'registarFactura');

    // Emitir a fatura sob contingência activa
    const emitida2 = await faturasService.emitir(faturaDTO2.id, ctx.clinica.id, ctx.admin.id);

    // Não deve tentar registar em tempo real
    expect(registarFacturaSpy).not.toHaveBeenCalled();

    // Deve usar a série de contingência (com sufixo C)
    const expectedSerie = `${ctx.clinica.serieDocFiscal || 'TEST'}C`;
    expect(emitida2.serieDocFiscal).toBe(expectedSerie);
    expect(emitida2.numeroFatura).toContain(expectedSerie);
    expect(emitida2.emContingencia).toBe(true);
    expect(emitida2.statusEnvio).toBe('CONTINGENCIA');

    registarFacturaSpy.mockRestore();
  });

  it('3. ContingencySyncService deve registrar a série com solicitarSerie, submeter em lote, e sair da contingência gracefully', async () => {
    // Mock de sucesso para solicitarSerie
    const solicitarSerieSpy = vi.spyOn(agtApiClient, 'solicitarSerie').mockResolvedValue({
      resultCode: 1,
      seriesFEResult: {
        seriesCode: 'TESTC-SR',
        authorizedQuantity: '1000',
        firstDocumentNo: '1',
        lastDocumentNo: '1000',
      },
    });

    // Mock de sucesso para registarFactura + validação assíncrona
    const registarFacturaSpy = vi.spyOn(agtApiClient, 'registarFactura').mockResolvedValue({
      requestID: 'SUCCESS-REQ-ID',
      documentStatusList: [],
    });
    const obterEstadoSpy = vi.spyOn(agtApiClient, 'obterEstado').mockResolvedValue({
      requestID: 'SUCCESS-REQ-ID',
      resultCode: '0',
      taxRegistrationNumber: ctx.clinica.nif || '999999999',
      documentStatusList: [],
    });

    // Executar a sincronização da clínica
    await contingencySyncService.syncPendingDocuments(ctx.clinica.id);

    // Deve ter chamado registrar série na AGT com o indicador 'C'
    expect(solicitarSerieSpy).toHaveBeenCalledTimes(1);
    const firstCall = solicitarSerieSpy.mock.calls[0];
    if (!firstCall) throw new Error('solicitarSerie não foi chamado');
    const solicitarSerieArgs = firstCall[0];
    expect(solicitarSerieArgs.seriesContingencyIndicator).toBe('C');
    expect(solicitarSerieArgs.seriesStartTS).toBeDefined();
    expect(solicitarSerieArgs.seriesEndTS).toBeDefined();

    // Deve ter registado as faturas acumuladas na AGT
    expect(registarFacturaSpy).toHaveBeenCalled();

    // Verificar se as sequências de contingência foram marcadas como registadas
    const sequencias = await prisma.sequenciaDocFiscal.findMany({
      where: { clinicaId: ctx.clinica.id },
    });

    // Todas as sequências activas de contingência devem ter sido encerradas
    const activeContingencies = sequencias.filter(s => s.isContingency && s.endTS === null);
    expect(activeContingencies.length).toBe(0);

    // E a sequência usada deve estar registada
    const contingenciaReg = sequencias.find(s => s.serie === `${ctx.clinica.serieDocFiscal || 'TEST'}C`);
    expect(contingenciaReg?.isRegistered).toBe(true);
    expect(contingenciaReg?.isContingency).toBe(false); // Virou inactivo após sync total

    // Verificar se os status das faturas mudaram para ENTREGUE
    const faturas = await prisma.fatura.findMany({
      where: { clinicaId: ctx.clinica.id },
    });

    for (const f of faturas) {
      expect(f.statusEnvio).toBe('ENTREGUE');
    }

    solicitarSerieSpy.mockRestore();
    registarFacturaSpy.mockRestore();
    obterEstadoSpy.mockRestore();
  });
});
