import type { AgtStatusResponse } from './types';
import { type AgtEnvioStatus } from './syncAgtSubmissionStatus';
export interface PollAgtSubmissionOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
}
export interface PollAgtSubmissionResult {
    status: AgtEnvioStatus;
    lastResponse: AgtStatusResponse;
    attempts: number;
}
/** resultCode 8 = ainda em processamento na fila AGT */
export declare function shouldRetryAgtStatusPoll(statusResult: AgtStatusResponse): boolean;
/**
 * Polling com backoff exponencial até estado final ou esgotar tentativas.
 * @see references/compliance/async-status-qrcode.md (skill AGT FE)
 */
export declare function pollAgtSubmissionStatus(fetchStatus: () => Promise<AgtStatusResponse>, options?: PollAgtSubmissionOptions): Promise<PollAgtSubmissionResult>;
//# sourceMappingURL=pollAgtSubmissionStatus.d.ts.map