import { AgtApiClient as BaseAgtApiClient } from '@clinicaplus/utils/server';
import { logger } from '../../lib/logger';

/**
 * Cliente da API AGT para a aplicação API.
 * Especializado com o logger do sistema.
 */
export class AgtApiClient extends BaseAgtApiClient {
  constructor() {
    super({
      logger,
      isMock: process.env.AGT_MOCK === 'true' || process.env.NODE_ENV === 'test',
      isSandbox: process.env.NODE_ENV !== 'production' || process.env.AGT_SANDBOX === 'true'
    });
  }
}

export const agtApiClient = new AgtApiClient();
