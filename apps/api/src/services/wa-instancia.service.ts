import { prisma } from '../lib/prisma';
import { evolutionApi } from '../lib/evolutionApi';
import { publishEvent } from '../lib/eventBus';
import { WaEstadoInstancia, Plano, WaInstancia } from '@prisma/client';
import { logger } from '../lib/logger';
import { auditLogService } from './auditLog.service';
import { redis } from '../lib/redis';
import crypto from 'crypto';

const CACHE_PREFIX = 'wa:instance:';

export const waInstanciaService = {
  /**
   * Limpa o cache da instância no Redis
   */
  async clearCache(evolutionName: string): Promise<void> {
    try {
      await redis.del(`${CACHE_PREFIX}${evolutionName}`);
    } catch (err) {
      logger.error({ evolutionName, err }, 'Erro ao limpar cache da instância');
    }
  },
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

  async criar(clinicaId: string, userId: string): Promise<WaInstancia> {
    const clinica = await prisma.clinica.findUniqueOrThrow({
      where: { id: clinicaId },
    });

    if (clinica.plano !== Plano.PRO && clinica.plano !== Plano.ENTERPRISE) {
      throw new Error('Módulo WhatsApp apenas disponível para planos PRO ou superiores.');
    }

    // Formato: cp-{slug}-{random6} (MODULE-whatsapp.md §6)
    const instanceName = `cp-${clinica.slug}-${crypto.randomBytes(3).toString('hex')}`;
    // O webhook aponta agora diretamente para a Engine NLU FastAPI
    const intelUrl = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
    const webhookUrl = `${intelUrl}/webhook/whatsapp`;
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

    const qrExpiresAt = qrCodeBase64 ? new Date(Date.now() + 60_000) : null;

    const instancia = await prisma.waInstancia.create({
      data: {
        clinicaId,
        evolutionName: instanceName,
        evolutionToken,
        qrCodeBase64,
        qrExpiresAt,
        estado: WaEstadoInstancia.AGUARDA_QR,
        atualizadoEm: new Date(),
      },
    });

    await auditLogService.log({
      actorId: userId,
      clinicaId,
      accao: 'CREATE',
      recurso: 'wa_instancia',
      recursoId: instancia.id,
      depois: { evolutionName: instanceName, estado: WaEstadoInstancia.AGUARDA_QR }
    });

    return instancia;
  },

  async obterQrCode(id: string, clinicaId: string): Promise<{ qrcode: string }> {
    const instancia = await this.getInstanciaOrThrow(id, clinicaId);
    
    try {
      const { base64 } = await evolutionApi.obterQrCode(instancia.evolutionName);

      const qrExpiresAt = new Date(Date.now() + 60_000);
      await prisma.waInstancia.update({
        where: { id: instancia.id },
        data: {
          qrCodeBase64: base64,
          qrExpiresAt,
          estado: WaEstadoInstancia.AGUARDA_QR,
          atualizadoEm: new Date()
        },
      });

      await this.clearCache(instancia.evolutionName);

      await publishEvent(`clinica:${clinicaId}`, 'whatsapp:qrcode', {
        instanciaId: instancia.id,
        qrCode: base64,
        expiresAt: qrExpiresAt
      });

      return { qrcode: base64 };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const errorWithResponse = error as { response?: { status?: number }; message?: string };
        if (errorWithResponse.response?.status === 404 || errorWithResponse.message?.includes('404')) {
          logger.warn({ clinicaId, id }, 'Instância 404 na Evolution. Tentando auto-recuperação...');
          
          try {
            const intelUrl = process.env.INTEL_SERVICE_URL || 'http://localhost:8001';
            const webhookUrl = `${intelUrl}/webhook/whatsapp`;
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
        atualizadoEm: new Date()
      },
    });

    await this.clearCache(evolutionName);

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
          atualizadoEm: new Date(),
          ...(numeroTelefone && { numeroTelefone }),
        },
      });
      await this.clearCache(evolutionName);
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
      logger.info({ id, evolutionName: instancia.evolutionName, resp }, 'Sincronização activa: Resposta da Evolution API');

      let novoEstado = instancia.estado;
      let keepQr = instancia.qrCodeBase64;
      let numeroTelefone = instancia.numeroTelefone;

      const safeState = (resp.instance?.state || '').toLowerCase();
      const isSucesso = ['open', 'connected', 'authenticated'].includes(safeState);
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
        const updated = await prisma.waInstancia.update({
          where: { id: instancia.id },
          data: {
            estado: novoEstado,
            qrCodeBase64: keepQr,
            numeroTelefone,
            atualizadoEm: new Date()
          },
        });
        await this.clearCache(instancia.evolutionName);
        return updated;
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

    await this.clearCache(instancia.evolutionName);
  }
};
