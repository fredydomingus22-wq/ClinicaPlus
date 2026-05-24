import {
  AgtApiClient as BaseAgtApiClient,
  requireAgtBasicAuthFromEnv,
  resolveAgtEnvFromProcessEnv,
  type AgtEnv,
} from '@clinicaplus/utils/server';
import { logger } from '../../lib/logger';

/**
 * Cliente da API AGT para a aplicação API.
 * Usa Basic Auth com credenciais do produtor de software (variáveis de ambiente).
 */
export class AgtApiClient extends BaseAgtApiClient {
  constructor() {
    const env: AgtEnv = resolveAgtEnvFromProcessEnv();
    const isMock = process.env.AGT_MOCK === 'true' || process.env.NODE_ENV === 'test';
    super({ env, logger, isMock });
  }

  /**
   * Retorna a string de autenticação Basic Auth no formato 'user:pass'.
   * A classe base converte automaticamente para Base64.
   * As credenciais são do produtor de software (globais, não por clínica).
   */
  public getBasicAuth(): string {
    return requireAgtBasicAuthFromEnv();
  }
}

export const agtApiClient = new AgtApiClient();
