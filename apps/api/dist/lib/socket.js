"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.setupSocket = setupSocket;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("./redis");
const config_1 = require("./config");
const logger_1 = require("./logger");
// Export io instance for graceful shutdown
exports.io = null;
/**
 * Sets up Socket.io on the provided HTTP server.
 * Handles authentication, room management, and bridging Redis Pub/Sub to Socket events.
 */
function setupSocket(httpServer) {
    exports.io = new socket_io_1.Server(httpServer, {
        path: '/ws',
        cors: {
            origin: (origin, callback) => {
                // Simple origin check for web app
                if (!origin || origin === config_1.config.FRONTEND_URL) {
                    return callback(null, true);
                }
                try {
                    const url = new URL(origin);
                    // Allow tenant subdomains
                    if (config_1.config.TENANT_BASE_DOMAIN && (url.hostname === config_1.config.TENANT_BASE_DOMAIN || url.hostname.endsWith(`.${config_1.config.TENANT_BASE_DOMAIN}`))) {
                        return callback(null, true);
                    }
                    // Allow localhost or 127.0.0.1 for development
                    if (config_1.config.NODE_ENV === 'development' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
                        return callback(null, true);
                    }
                }
                catch {
                    // Rejection handled by default
                }
                callback(null, false);
            },
            credentials: true
        },
    });
    // Autenticação: accessToken no handshake.auth.token
    exports.io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            logger_1.logger.warn({ handshake: socket.handshake }, 'WS Handshake: Nenhum token fornecido');
            return next(new Error('Não autenticado'));
        }
        try {
            const payload = jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
            socket.data.user = payload;
            // Token expiration push
            if (payload.exp) {
                const remaining = (payload.exp * 1000) - Date.now();
                if (remaining > 0) {
                    const timer = setTimeout(() => {
                        if (socket.connected) {
                            socket.emit('auth:expired', { message: 'Sessão expirada. Por favor, inicie sessão novamente.' });
                            socket.disconnect(true);
                        }
                    }, remaining);
                    socket.on('disconnect', () => clearTimeout(timer));
                }
            }
            next();
        }
        catch (err) {
            logger_1.logger.warn({ err, token: token.substring(0, 10) + '...' }, 'WS Handshake: Falha na autenticação');
            next(new Error('Token inválido'));
        }
    });
    exports.io.on('connection_error', (err) => {
        logger_1.logger.error({ err }, 'WS Connection Error');
    });
    exports.io.on('connection', (socket) => {
        const { clinicaId, id: userId, papel } = socket.data.user;
        logger_1.logger.debug({ userId, clinicaId, papel }, 'WS Client connected');
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
        // Rate Limiting: 100 events/min
        const eventLimit = { count: 0, resetAt: Date.now() + 60000 };
        socket.use(([event], next) => {
            const now = Date.now();
            if (now > eventLimit.resetAt) {
                eventLimit.count = 1;
                eventLimit.resetAt = now + 60000;
            }
            else {
                eventLimit.count++;
            }
            if (eventLimit.count > 100) {
                logger_1.logger.warn({ userId, event }, 'WS: Rate limit exceeded');
                return next(new Error('Rate limit exceeded (100 msg/min)'));
            }
            next();
        });
        socket.on('disconnect', () => {
            logger_1.logger.debug({ userId }, 'WS Client disconnected');
        });
    });
    // Redis pub/sub → reencaminhar para rooms
    redis_1.redisSub.subscribe('cp:eventos').catch((err) => {
        logger_1.logger.error({ err }, 'WS: Falha ao subscrever canal de eventos no Redis');
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis_1.redisSub.on('message', (channel, msg) => {
        if (channel !== 'cp:eventos')
            return;
        try {
            const { room, event, data } = JSON.parse(msg);
            if (!room || !event) {
                logger_1.logger.warn({ msg }, 'WS: Mensagem de evento inválida recebida do Redis');
                return;
            }
            // Room Isolation Verification: 
            // Ensure that if the event is destined for a clinica, it matches a known room pattern.
            // This is primarily for safety against misconfigured emitters in other services.
            // E.g., don't allow emitting to a room that doesn't belong to the system.
            if (room.startsWith('clinica:') || room.startsWith('user:') || room.startsWith('medico:') || room.startsWith('paciente:')) {
                if (exports.io) {
                    exports.io.to(room).emit(event, data);
                    logger_1.logger.trace({ room, event }, 'WS: Evento emitido');
                }
            }
            else {
                logger_1.logger.warn({ room, event }, 'WS: Tentativa de emitir para sala não autorizada bloqueada');
            }
        }
        catch (err) {
            logger_1.logger.error({ err, msg }, 'WS: Erro ao processar mensagem do Redis');
        }
    });
    logger_1.logger.info('✅ WebSocket (Socket.io) initialized on /ws');
    return exports.io;
}
