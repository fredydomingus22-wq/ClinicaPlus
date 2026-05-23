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
        expect.stringMatching(/^cp-clinica-plus-[0-9a-f]{6}$/),
        expect.stringMatching(/\/webhook\/whatsapp$/)
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
            evolutionName: expect.stringMatching(/^cp-clinica-plus-[0-9a-f]{6}$/),
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
      mockPrisma.waInstancia.findFirst.mockResolvedValueOnce({ 
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
        expect.stringMatching(/^cp-clinica-plus-[0-9a-f]{6}$/),
        expect.stringMatching(/\/webhook\/whatsapp$/)
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
          where: { id: 'ins-1' },
          data: expect.objectContaining({ qrCodeBase64: 'base64-test', estado: WaEstadoInstancia.AGUARDA_QR })
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
        { instanciaId: 'ins-1', qrCodeBase64: 'base64-test' }
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
          where: { id: 'ins-1' },
          data: expect.objectContaining({ estado: WaEstadoInstancia.CONECTADO, qrCodeBase64: null })
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
          where: { id: 'ins-1' },
          data: expect.objectContaining({ estado: WaEstadoInstancia.DESCONECTADO, qrCodeBase64: null })
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
        expect.objectContaining({
          where: { id: 'ins-1' },
          data: expect.objectContaining({ estado: WaEstadoInstancia.CONECTADO, qrCodeBase64: null })
        })
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
        { instanciaId: 'ins-1', estado: WaEstadoInstancia.CONECTADO }
      );
    });
  });

  describe('desligar', () => {
    it('deve fazer logout na Evolution API e actualizar DB para DESCONECTADO', async () => {
      mockPrisma.waInstancia.findFirst.mockResolvedValue({ 
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
          where: { id: 'ins-1' },
          data: expect.objectContaining({ estado: WaEstadoInstancia.DESCONECTADO, qrCodeBase64: null })
        })
      );
    });
  });

  describe('eliminar', () => {
    const mockInstancia = {
      id: 'ins-1',
      clinicaId: 'clinica-1',
      evolutionName: 'cp-clinica-1-prod',
      evolutionToken: 'token-123',
      estado: WaEstadoInstancia.CONECTADO,
      numeroTelefone: '+244923456789',
      qrCodeBase64: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      qrExpiresAt: null
    } as WaInstancia;

    it('deve eliminar instância na Evolution API e no DB', async () => {
      mockPrisma.waInstancia.findFirst.mockResolvedValue(mockInstancia);
      mockEvolutionApi.eliminar.mockResolvedValue(undefined);
      mockPrisma.waInstancia.delete.mockResolvedValue(mockInstancia);

      await waInstanciaService.eliminar('ins-1', 'clinica-1');

      expect(mockEvolutionApi.eliminar).toHaveBeenCalledWith('cp-clinica-1-prod');
      expect(mockPrisma.waInstancia.delete).toHaveBeenCalledWith({
        where: { id: 'ins-1' }
      });
    });

    it('deve eliminar do DB mesmo se Evolution API falhar', async () => {
      mockPrisma.waInstancia.findFirst.mockResolvedValue(mockInstancia);
      mockEvolutionApi.eliminar.mockRejectedValue(new Error('Evolution API offline'));
      mockPrisma.waInstancia.delete.mockResolvedValue(mockInstancia);

      await waInstanciaService.eliminar('ins-1', 'clinica-1');

      // Deve continuar e fazer delete no DB mesmo que Evolution falhe
      expect(mockPrisma.waInstancia.delete).toHaveBeenCalledWith({
        where: { id: 'ins-1' }
      });
    });

    it('deve lançar erro se instância não pertence à clínica', async () => {
      mockPrisma.waInstancia.findFirst.mockResolvedValue(null);

      await expect(
        waInstanciaService.eliminar('ins-1', 'clinica-errada')
      ).rejects.toThrow();
    });
  });
});
