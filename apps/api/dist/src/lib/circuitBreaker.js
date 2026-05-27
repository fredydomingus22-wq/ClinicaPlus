"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakers = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
exports.initializeCircuitBreakers = initializeCircuitBreakers;
const opossum_1 = __importDefault(require("opossum"));
const logger_1 = require("./logger");
/**
 * Opções padrão para circuit breakers
 */
const defaultOptions = {
    timeout: 10000, // 10 segundos
    errorThresholdPercentage: 50, // 50% de erros abre o circuito
    resetTimeout: 30000, // 30 segundos para tentar fechar o circuito
    rollingCountTimeout: 10000, // 10 segundos de janela de métricas
    rollingCountBuckets: 10, // 10 buckets na janela
};
/**
 * Cria um circuit breaker para uma função assíncrona
 */
function createCircuitBreaker(fn, name, options) {
    const breaker = new opossum_1.default(fn, {
        ...defaultOptions,
        ...options,
    });
    breaker.on('open', () => {
        logger_1.logger.warn({ name }, `Circuit breaker opened for ${name}`);
    });
    breaker.on('halfOpen', () => {
        logger_1.logger.info({ name }, `Circuit breaker half-open for ${name}`);
    });
    breaker.on('close', () => {
        logger_1.logger.info({ name }, `Circuit breaker closed for ${name}`);
    });
    breaker.on('fallback', (result) => {
        logger_1.logger.warn({ name, result }, `Fallback triggered for ${name}`);
    });
    return breaker;
}
/**
 * Circuit breakers para serviços externos
 */
exports.circuitBreakers = {
    evolutionApi: null,
    agtApi: null,
    resendApi: null,
};
/**
 * Inicializa circuit breakers para serviços externos
 */
function initializeCircuitBreakers() {
    // Evolution API
    if (!exports.circuitBreakers.evolutionApi) {
        exports.circuitBreakers.evolutionApi = createCircuitBreaker(async () => {
            // Placeholder - será substituído pela função real
            throw new Error('Evolution API circuit breaker not initialized');
        }, 'evolution-api', { timeout: 15000 } // 15 segundos para Evolution API
        );
    }
    // AGT API
    if (!exports.circuitBreakers.agtApi) {
        exports.circuitBreakers.agtApi = createCircuitBreaker(async () => {
            // Placeholder - será substituído pela função real
            throw new Error('AGT API circuit breaker not initialized');
        }, 'agt-api', { timeout: 20000 } // 20 segundos para AGT API
        );
    }
    // Resend API
    if (!exports.circuitBreakers.resendApi) {
        exports.circuitBreakers.resendApi = createCircuitBreaker(async () => {
            // Placeholder - será substituído pela função real
            throw new Error('Resend API circuit breaker not initialized');
        }, 'resend-api', { timeout: 10000 } // 10 segundos para Resend API
        );
    }
    logger_1.logger.info('Circuit breakers initialized');
}
