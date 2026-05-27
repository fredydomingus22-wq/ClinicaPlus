import type { AgtStatusResponse } from './types';
export type AgtEnvioStatus = 'ENVIADO' | 'ENTREGUE' | 'ERRO';
/**
 * Mapeia a resposta de obterEstado para o statusEnvio local.
 */
export declare function mapAgtStatusToEnvio(statusResult: AgtStatusResponse): AgtEnvioStatus;
//# sourceMappingURL=syncAgtSubmissionStatus.d.ts.map