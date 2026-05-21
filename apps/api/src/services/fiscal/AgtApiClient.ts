import { AgtApiClient as BaseAgtApiClient } from '@clinicaplus/utils/server';
import { logger } from '../../lib/logger';

/**
 * Cliente da API AGT para a aplicação API.
 * Usa Basic Auth com credenciais do produtor de software (variáveis de ambiente).
 */
export class AgtApiClient extends BaseAgtApiClient {
  constructor() {
    const isSandbox = process.env.NODE_ENV !== 'production' || process.env.AGT_SANDBOX === 'true';
    const baseUrl = isSandbox ? 'sandbox' : 'production';
    const isMock = process.env.AGT_MOCK === 'true' || process.env.NODE_ENV === 'test';
    super(baseUrl, logger, isMock);
  }

  /**
   * Retorna a string de autenticação Basic Auth no formato 'user:pass'.
   * A classe base converte automaticamente para Base64.
   * As credenciais são do produtor de software (globais, não por clínica).
   */
  public getBasicAuth(): string {
    const username = process.env.AGT_USERNAME;
    const password = process.env.AGT_PASSWORD;

    if (!username || !password) {
      logger.error('Credenciais AGT (AGT_USERNAME/AGT_PASSWORD) não configuradas no .env');
      throw new Error('Credenciais AGT não configuradas. Verifique AGT_USERNAME e AGT_PASSWORD no .env');
    }

    return `${username}:${password}`;
  }
}

export const agtApiClient = new AgtApiClient();
