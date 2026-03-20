import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { redisSub } from './redis';
import { config } from './config';
import { logger } from './logger';

interface JwtPayload {
  id: string;
  clinicaId: string;
  papel: string;
}

/**
 * Sets up Socket.io on the provided HTTP server.
 * Handles authentication, room management, and bridging Redis Pub/Sub to Socket events.
 */
export function setupSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    path: '/ws',
    cors: { 
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
        // Simple origin check for web app
        if (!origin || origin === config.FRONTEND_URL) {
          return callback(null, true);
        }
        
        try {
          const url = new URL(origin);
          // Allow tenant subdomains
          if (config.TENANT_BASE_DOMAIN && (url.hostname === config.TENANT_BASE_DOMAIN || url.hostname.endsWith(`.${config.TENANT_BASE_DOMAIN}`))) {
            return callback(null, true);
          }
          // Allow localhost or 127.0.0.1 for development
          if (config.NODE_ENV === 'development' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
            return callback(null, true);
          }
        } catch {
          // Rejection handled by default
        }
        
        callback(null, false);
      },
      credentials: true 
    },
  });

  // Autenticação: accessToken no handshake.auth.token
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    
    if (!token) {
      logger.warn({ handshake: socket.handshake }, 'WS Handshake: Nenhum token fornecido');
      return next(new Error('Não autenticado'));
    }

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as unknown as JwtPayload;
      socket.data.user = payload;
      next();
    } catch (err: unknown) {
      logger.warn({ err, token: token.substring(0, 10) + '...' }, 'WS Handshake: Falha na autenticação');
      next(new Error('Token inválido'));
    }
  });

  io.on('connection_error', (err) => {
    logger.error({ err }, 'WS Connection Error');
  });

  io.on('connection', (socket) => {
    const { clinicaId, id: userId, papel } = socket.data.user;
    
    logger.debug({ userId, clinicaId, papel }, 'WS Client connected');

    // Join common rooms
    socket.join(`clinica:${clinicaId}`);
    socket.join(`user:${userId}`);
    
    // Join specific role rooms
    if (papel === 'MEDICO') {
      socket.join(`medico:${userId}`);
    }
    if (papel === 'PACIENTE') {
      socket.join(`paciente:${userId}`);
    }

    socket.on('disconnect', () => {
      logger.debug({ userId }, 'WS Client disconnected');
    });
  });

  // Redis pub/sub → reencaminhar para rooms
  redisSub.subscribe('cp:eventos').catch((err: unknown) => {
    logger.error({ err }, 'WS: Falha ao subscrever canal de eventos no Redis');
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redisSub.on('message', (channel: any, msg: any) => {
    if (channel !== 'cp:eventos') return;

    try {
      const { room, event, data } = JSON.parse(msg);
      
      if (!room || !event) {
        logger.warn({ msg }, 'WS: Mensagem de evento inválida recebida do Redis');
        return;
      }

      // Emit to the specified room
      io.to(room).emit(event, data);
      
      logger.trace({ room, event }, 'WS: Evento emitido');
    } catch (err: unknown) {
      logger.error({ err, msg }, 'WS: Erro ao processar mensagem do Redis');
    }
  });

  logger.info('✅ WebSocket (Socket.io) initialized on /ws');

  return io;
}
