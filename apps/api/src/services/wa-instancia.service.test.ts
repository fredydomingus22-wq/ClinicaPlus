import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from '../test/mocks/prisma.mock';
import { mockEvolutionApi } from '../test/mocks/evolutionApi.mock';
import { WaEstadoInstancia, WaInstancia, Clinica, Plano } from '@prisma/client';
import { EstadoSubscricao } from '@clinicaplus/types';
import { waInstanciaService } from './wa-instancia.service';
import { publishEvent } from '../lib/eventBus';

// 1. Mock do config
vi.mock('../lib/config', () => ({
  config: {
    API_PUBLIC_URL: 'https://api.test',
    EVOLUTION_WEBHOOK_SECRET: 'secret'
  }
}));

// 2. Mock do eventBus
vi.mock('../lib/eventBus', () => ({
  publishEvent: vi.fn(),
}));

describe('waInstanciaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar instância na Evolution API com nome gerado', async () => {
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ 
        id: 'clinica-1',
        nome: 'Clínica Plus',
        slug: 'clinica-plus',
        email: 'test@clinica.plus',
        plano: Plano.PRO,
        ativo: true,
        subscricaoEstado: EstadoSubscricao.ACTIVA,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        logo: null,
        telefone: null,
        endereco: null,
        cidade: null,
        provincia: null,
        subscricaoValidaAte: null
      } as Clinica); 
      mockPrisma.waInstancia.findUnique.mockResolvedValue(null);
      mockPrisma.waInstancia.create.mockResolvedValue({ 
        id: 'ins-1',
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.criar('clinica-1', 'user-1');

      expect(mockEvolutionApi.criarInstancia).toHaveBeenCalledWith(
        'cp-clinica-1-prod',
        expect.any(String)
      );
    });

    it('deve persistir instância no DB com estado AGUARDA_QR', async () => {
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ 
        id: 'clinica-1',
        nome: 'Clínica Plus',
        slug: 'clinica-plus',
        email: 'test@clinica.plus',
        plano: Plano.PRO,
        ativo: true,
        subscricaoEstado: EstadoSubscricao.ACTIVA,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        logo: null,
        telefone: null,
        endereco: null,
        cidade: null,
        provincia: null,
        subscricaoValidaAte: null
      } as Clinica);
      mockPrisma.waInstancia.findUnique.mockResolvedValue(null);

      await waInstanciaService.criar('clinica-1', 'user-1');

      expect(mockPrisma.waInstancia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinicaId: 'clinica-1',
            evolutionName: 'cp-clinica-1-prod',
            evolutionToken: expect.any(String),
            estado: WaEstadoInstancia.AGUARDA_QR,
          })
        })
      );
    });

    it('deve falhar se clínica já tem instância activa', async () => {
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ 
        id: 'clinica-1',
        nome: 'Clínica Plus',
        slug: 'clinica-plus',
        email: 'test@clinica.plus',
        plano: Plano.PRO,
        ativo: true,
        subscricaoEstado: EstadoSubscricao.ACTIVA,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        logo: null,
        telefone: null,
        endereco: null,
        cidade: null,
        provincia: null,
        subscricaoValidaAte: null
      } as Clinica);
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1',
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await expect(waInstanciaService.criar('clinica-1', 'user-1')).rejects.toThrow();
    });

    it('deve falhar se plano não é PRO ou ENTERPRISE', async () => {
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ 
        id: 'clinica-1',
        nome: 'Clínica Plus',
        slug: 'clinica-plus',
        email: 'test@clinica.plus',
        plano: Plano.BASICO,
        ativo: true,
        subscricaoEstado: EstadoSubscricao.ACTIVA,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        logo: null,
        telefone: null,
        endereco: null,
        cidade: null,
        provincia: null,
        subscricaoValidaAte: null
      } as Clinica);
      mockPrisma.waInstancia.findUnique.mockResolvedValue(null);

      await expect(waInstanciaService.criar('clinica-1', 'user-1')).rejects.toThrow();
    });

    it('deve configurar webhook URL correcta na Evolution API', async () => {
      mockPrisma.clinica.findUniqueOrThrow.mockResolvedValue({ 
        id: 'clinica-1',
        nome: 'Clínica Plus',
        slug: 'clinica-plus',
        email: 'test@clinica.plus',
        plano: Plano.PRO,
        ativo: true,
        subscricaoEstado: EstadoSubscricao.ACTIVA,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        logo: null,
        telefone: null,
        endereco: null,
        cidade: null,
        provincia: null,
        subscricaoValidaAte: null
      } as Clinica);
      mockPrisma.waInstancia.findUnique.mockResolvedValue(null);

      await waInstanciaService.criar('clinica-1', 'user-1');

      expect(mockEvolutionApi.criarInstancia).toHaveBeenCalledWith(
        'cp-clinica-1-prod',
        'https://api.test/api/whatsapp/webhook'
      );
    });
  });

  describe('processarQrCode', () => {
    it('deve guardar qrCodeBase64 no DB quando recebe QRCODE_UPDATED', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.processarQrCode('clinica-1', 'base64-test');

      expect(mockPrisma.waInstancia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicaId: 'clinica-1' },
          data: { qrCodeBase64: 'base64-test', estado: WaEstadoInstancia.AGUARDA_QR }
        })
      );
    });

    it('deve publicar evento whatsapp:qrcode via WebSocket', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.processarQrCode('clinica-1', 'base64-test');

      expect(publishEvent).toHaveBeenCalledWith(
        'clinica:clinica-1',
        'whatsapp:qrcode',
        { qrCodeBase64: 'base64-test' }
      );
    });
  });

  describe('processarConexao', () => {
    it('deve actualizar estado para CONECTADO quando state=open', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.processarConexao('clinica-1', 'open');

      expect(mockPrisma.waInstancia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicaId: 'clinica-1' },
          data: { estado: WaEstadoInstancia.CONECTADO, qrCodeBase64: null }
        })
      );
    });

    it('deve actualizar estado para DESCONECTADO quando state=close', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.CONECTADO,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.processarConexao('clinica-1', 'close');

      expect(mockPrisma.waInstancia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicaId: 'clinica-1' },
          data: { estado: WaEstadoInstancia.DESCONECTADO, qrCodeBase64: null }
        })
      );
    });

    it('deve limpar qrCodeBase64 quando CONECTADO', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);
      
      await waInstanciaService.processarConexao('clinica-1', 'open');
      
      expect(mockPrisma.waInstancia.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ qrCodeBase64: null }) })
      );
    });

    it('deve publicar evento whatsapp:estado via WebSocket', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1',
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.AGUARDA_QR,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.processarConexao('clinica-1', 'open');

      expect(publishEvent).toHaveBeenCalledWith(
        'clinica:clinica-1',
        'whatsapp:estado',
        { estado: WaEstadoInstancia.CONECTADO }
      );
    });
  });

  describe('desligar', () => {
    it('deve fazer logout na Evolution API e actualizar DB para DESCONECTADO', async () => {
      mockPrisma.waInstancia.findUnique.mockResolvedValue({ 
        id: 'ins-1', 
        clinicaId: 'clinica-1', 
        evolutionName: 'cp-clinica-1-prod',
        evolutionToken: 'token-123',
        estado: WaEstadoInstancia.CONECTADO,
        numeroTelefone: null,
        qrCodeBase64: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        qrExpiresAt: null
      } as WaInstancia);

      await waInstanciaService.desligar('clinica-1', 'user-1');

      expect(mockEvolutionApi.desligar).toHaveBeenCalledWith('cp-clinica-1-prod');
      expect(mockPrisma.waInstancia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicaId: 'clinica-1' },
          data: { estado: WaEstadoInstancia.DESCONECTADO, qrCodeBase64: null }
        })
      );
    });
  });
});
