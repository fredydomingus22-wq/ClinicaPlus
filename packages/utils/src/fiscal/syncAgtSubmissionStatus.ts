import type { AgtStatusResponse } from './types';

export type AgtEnvioStatus = 'ENVIADO' | 'ENTREGUE' | 'ERRO';

/**
 * Mapeia a resposta de obterEstado para o statusEnvio local.
 */
export function mapAgtStatusToEnvio(statusResult: AgtStatusResponse): AgtEnvioStatus {
  const resultCode = String(statusResult.resultCode);

  if (resultCode === '0') {
    return 'ENTREGUE';
  }

  if (resultCode === '2' || resultCode === '9') {
    return 'ERRO';
  }

  if (resultCode === '1' && statusResult.documentStatusList?.length) {
    const allValid = statusResult.documentStatusList.every((d) => d.documentStatus === 'V');
    return allValid ? 'ENTREGUE' : 'ERRO';
  }

  return 'ENVIADO';
}
