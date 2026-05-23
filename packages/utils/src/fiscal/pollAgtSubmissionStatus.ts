import type { AgtStatusResponse } from './types';
import { mapAgtStatusToEnvio, type AgtEnvioStatus } from './syncAgtSubmissionStatus';

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
export function shouldRetryAgtStatusPoll(statusResult: AgtStatusResponse): boolean {
  return String(statusResult.resultCode) === '8';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polling com backoff exponencial até estado final ou esgotar tentativas.
 * @see references/compliance/async-status-qrcode.md (skill AGT FE)
 */
export async function pollAgtSubmissionStatus(
  fetchStatus: () => Promise<AgtStatusResponse>,
  options: PollAgtSubmissionOptions = {}
): Promise<PollAgtSubmissionResult> {
  const maxAttempts = options.maxAttempts ?? Number(process.env.AGT_POLL_MAX_ATTEMPTS || 5);
  const initialDelayMs = options.initialDelayMs ?? Number(process.env.AGT_POLL_INITIAL_MS || 1500);
  const maxDelayMs = options.maxDelayMs ?? Number(process.env.AGT_POLL_MAX_MS || 12000);

  let lastResponse: AgtStatusResponse = {
    requestID: '',
    resultCode: '8',
    taxRegistrationNumber: '',
  };
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResponse = await fetchStatus();
    const status = mapAgtStatusToEnvio(lastResponse);

    if (status !== 'ENVIADO' || !shouldRetryAgtStatusPoll(lastResponse)) {
      return { status, lastResponse, attempts: attempt };
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }

  return {
    status: mapAgtStatusToEnvio(lastResponse),
    lastResponse,
    attempts: maxAttempts,
  };
}
