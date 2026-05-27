import CircuitBreaker from 'opossum';
import { logger } from './logger';

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
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string,
  options?: Partial<typeof defaultOptions>
): CircuitBreaker {
  const breaker = new CircuitBreaker(fn, {
    ...defaultOptions,
    ...options,
  });

  breaker.on('open', () => {
    logger.warn({ name }, `Circuit breaker opened for ${name}`);
  });

  breaker.on('halfOpen', () => {
    logger.info({ name }, `Circuit breaker half-open for ${name}`);
  });

  breaker.on('close', () => {
    logger.info({ name }, `Circuit breaker closed for ${name}`);
  });

  breaker.on('fallback', (result: unknown) => {
    logger.warn({ name, result }, `Fallback triggered for ${name}`);
  });

  return breaker;
}

/**
 * Circuit breakers para serviços externos
 */
export const circuitBreakers = {
  evolutionApi: null as CircuitBreaker | null,
  agtApi: null as CircuitBreaker | null,
  resendApi: null as CircuitBreaker | null,
};

/**
 * Inicializa circuit breakers para serviços externos
 */
export function initializeCircuitBreakers() {
  // Evolution API
  if (!circuitBreakers.evolutionApi) {
    circuitBreakers.evolutionApi = createCircuitBreaker(
      async () => {
        // Placeholder - será substituído pela função real
        throw new Error('Evolution API circuit breaker not initialized');
      },
      'evolution-api',
      { timeout: 15000 } // 15 segundos para Evolution API
    );
  }

  // AGT API
  if (!circuitBreakers.agtApi) {
    circuitBreakers.agtApi = createCircuitBreaker(
      async () => {
        // Placeholder - será substituído pela função real
        throw new Error('AGT API circuit breaker not initialized');
      },
      'agt-api',
      { timeout: 20000 } // 20 segundos para AGT API
    );
  }

  // Resend API
  if (!circuitBreakers.resendApi) {
    circuitBreakers.resendApi = createCircuitBreaker(
      async () => {
        // Placeholder - será substituído pela função real
        throw new Error('Resend API circuit breaker not initialized');
      },
      'resend-api',
      { timeout: 10000 } // 10 segundos para Resend API
    );
  }

  logger.info('Circuit breakers initialized');
}
