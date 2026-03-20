import { prisma } from '../lib/prisma';
import { evolutionApi } from '../lib/evolutionApi';
import { publishEvent } from '../lib/eventBus';
import { config } from '../lib/config';
import { WaEstadoInstancia, Plano, WaInstancia } from '@prisma/client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export const waInstanciaService = {
  /**
   * Busca todas as instâncias de uma clínica
   */
  async listarPorClinica(clinicaId: string): Promise<WaInstancia[]> {
    return prisma.waInstancia.findMany({
      where: { clinicaId },
      orderBy: { criadoEm: 'asc' }
    });
  },

  /**
   * Busca uma instância específica por ID
   */
  async obterPorId(id: string, clinicaId: string): Promise<WaInstancia | null> {
    return prisma.waInstancia.findFirst({
      where: { id, clinicaId },
    });
  },

  /**
   * Helper interno para buscar instância ou lançar erro
   */
  async getInstanciaOrThrow(id: string, clinicaId: string): Promise<WaInstancia> {
    const instancia = await this.obterPorId(id, clinicaId);
    if (!instancia) {
      throw new Error('Instância do WhatsApp não encontrada para esta clínica.');
    }
    return instancia;
  },

  async criar(clinicaId: string): Promise<WaInstancia> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
    });

    if (clinica.plano !== Plano.PRO && clinica.plano !== Plano.ENTERPRISE) {
      throw new Error('Módulo WhatsApp apenas disponível para planos PRO ou superiores.');
    }

    // Gerar nome único baseado em clinicaId e timestamp para permitir múltiplas
    const instanceName = `cp-${clinicaId}-${Date.now()}`;
    const webhookUrl = `${config.API_PUBLIC_URL}/api/whatsapp/webhook`;
    const evolutionToken = crypto.randomUUID();

    await evolutionApi.criarInstancia(instanceName, webhookUrl);

    let qrCodeBase64: string | null = null;
    
    // Tentativa inicial de obter QR code (Evolution pode demorar uns ms)
    try {
      // Pequeno delay para dar tempo à Evolution de inicializar a sessão Baileys
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await evolutionApi.obterQrCode(instanceName);
      qrCodeBase64 = res.base64;
    } catch {
      logger.warn({ instanceName }, 'Não foi possível obter QR inicial após criação. O polling tratará do resto.');
    }

    return prisma.waInstancia.create({
      data: {
        clinicaId,
        evolutionName: instanceName,
        evolutionToken,
        qrCodeBase64,
        estado: WaEstadoInstancia.AGUARDA_QR,
      },
    });
  },

  async obterQrCode(id: string, clinicaId: string): Promise<{ qrcode: string }> {
    const instancia = await this.getInstanciaOrThrow(id, clinicaId);
    
    try {
      const { base64 } = await evolutionApi.obterQrCode(instancia.evolutionName);

      await prisma.waInstancia.update({
        where: { id: instancia.id },
        data: {
          qrCodeBase64: base64,
          estado: WaEstadoInstancia.AGUARDA_QR,
        },
      });

      return { qrcode: base64 };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const errorWithResponse = error as { response?: { status?: number }; message?: string };
        if (errorWithResponse.response?.status === 404 || errorWithResponse.message?.includes('404')) {
          logger.warn({ clinicaId, id }, 'Instância 404 na Evolution. Tentando auto-recuperação...');
          
          try {
            const webhookUrl = `${config.API_PUBLIC_URL}/api/whatsapp/webhook`;
            await evolutionApi.criarInstancia(instancia.evolutionName, webhookUrl);
            const res = await evolutionApi.obterQrCode(instancia.evolutionName);
            
            await prisma.waInstancia.update({
              where: { id: instancia.id },
              data: {
                qrCodeBase64: res.base64,
                estado: WaEstadoInstancia.AGUARDA_QR,
              },
            });
            
            return { qrcode: res.base64 };
          } catch {
            logger.error({ id }, 'Falha na auto-recuperação de instância');
            throw error;
          }
        }
      }
      
      throw error;
    }
  },

  async processarQrCode(evolutionName: string, qrBase64: string): Promise<void> {
    const instancia = await prisma.waInstancia.findUnique({
      where: { evolutionName }
    });

    if (!instancia) return;

    await prisma.waInstancia.update({
      where: { id: instancia.id },
      data: {
        qrCodeBase64: qrBase64,
        estado: WaEstadoInstancia.AGUARDA_QR,
      },
    });

    await publishEvent(`clinica:${instancia.clinicaId}`, 'whatsapp:qrcode', {
      instanciaId: instancia.id,
      qrCodeBase64: qrBase64,
    });
  },

  async processarConexao(evolutionName: string, state: string, numeroTelefone?: string): Promise<void> {
    const instancia = await prisma.waInstancia.findUnique({
      where: { evolutionName }
    });

    if (!instancia) return;
    
    let novoEstado = instancia.estado as WaEstadoInstancia;
    let keepQr = instancia.qrCodeBase64;

    const isSucesso = ['open', 'CONNECTED', 'authenticated'].includes(state);
    const isErro = ['close', 'refused', 'rejected'].includes(state);
    const isPendente = ['connecting', 'pairing'].includes(state);

    if (isSucesso) {
      novoEstado = WaEstadoInstancia.CONECTADO;
      keepQr = null;
    } else if (isErro) {
      novoEstado = WaEstadoInstancia.DESCONECTADO;
      keepQr = null;
    } else if (isPendente) {
      novoEstado = WaEstadoInstancia.AGUARDA_QR;
    }

    if (novoEstado !== instancia.estado || keepQr !== instancia.qrCodeBase64) {
      logger.info({ evolutionName, old: instancia.estado, new: novoEstado, state }, 'Estado da instância actualizado via Webhook');
      await prisma.waInstancia.update({
        where: { id: instancia.id },
      data: {
        estado: novoEstado,
        qrCodeBase64: keepQr,
        ...(numeroTelefone && { numeroTelefone }),
      },
      });
    }

    await publishEvent(`clinica:${instancia.clinicaId}`, 'whatsapp:estado', {
      instanciaId: instancia.id,
      estado: novoEstado,
    });
  },

  async sincronizarEstado(id: string, clinicaId: string): Promise<WaInstancia> {
    const instancia = await this.getInstanciaOrThrow(id, clinicaId);

    try {
      const resp = await evolutionApi.estadoConexao(instancia.evolutionName);
      const { state } = resp;
      
      logger.info({ id, evolutionName: instancia.evolutionName, rawState: state, resp }, 'Sincronização activa: Resposta da Evolution API');

      let novoEstado = instancia.estado;
      let keepQr = instancia.qrCodeBase64;
      let numeroTelefone = instancia.numeroTelefone;

      const safeState = (state || '').toLowerCase();
      const isSucesso = ['open', 'connected', 'authenticated', 'connecting'].includes(safeState);
      const isErro = ['close', 'refused', 'rejected', 'disconnected'].includes(safeState);
      const isPendente = ['connecting', 'pairing'].includes(safeState);

      if (isSucesso) {
        novoEstado = WaEstadoInstancia.CONECTADO;
        keepQr = null;

        // Se conectou e não temos o número, tentar recuperar activamente
        if (!numeroTelefone) {
          try {
            const detalhes = await evolutionApi.obterDetalhes(instancia.evolutionName);
            if (detalhes.number) {
              numeroTelefone = detalhes.number;
              logger.info({ id, numeroTelefone }, 'Número de telefone recuperado durante sincronização activa');
            }
          } catch (err) {
            logger.warn({ id, err }, 'Não foi possível recuperar detalhes da instância durante a sincronização');
          }
        }
      } else if (isErro) {
        novoEstado = WaEstadoInstancia.DESCONECTADO;
        keepQr = null;
      } else if (isPendente) {
        novoEstado = WaEstadoInstancia.AGUARDA_QR;
      }

      if (novoEstado !== instancia.estado || keepQr !== instancia.qrCodeBase64) {
        logger.info({ id, old: instancia.estado, new: novoEstado }, 'Persistindo novo estado sincronizado');
        return await prisma.waInstancia.update({
          where: { id: instancia.id },
          data: {
            estado: novoEstado,
            qrCodeBase64: keepQr,
            numeroTelefone,
          },
        });
      }

      return instancia;
    } catch (err) {
      logger.error({ id, err }, 'Falha crítica na sincronização com Evolution API');
      return instancia;
    }
  },

  async desligar(id: string, clinicaId: string): Promise<void> {
    const instancia = await this.getInstanciaOrThrow(id, clinicaId);

    try {
      await evolutionApi.desligar(instancia.evolutionName);
    } catch {
      // Ignorar se já estiver offline
    }

    await prisma.waInstancia.update({
      where: { id: instancia.id },
      data: {
        estado: WaEstadoInstancia.DESCONECTADO,
        qrCodeBase64: null,
      },
    });
  },

  async eliminar(id: string, clinicaId: string): Promise<void> {
    const instancia = await this.getInstanciaOrThrow(id, clinicaId);

    try {
      await evolutionApi.eliminar(instancia.evolutionName);
    } catch {
      // Ignorar
    }

    await prisma.waInstancia.delete({
      where: { id: instancia.id },
    });
  }
};
