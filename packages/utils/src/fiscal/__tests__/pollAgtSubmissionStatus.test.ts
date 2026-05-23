import { describe, it, expect, vi } from 'vitest';
import {
  pollAgtSubmissionStatus,
  shouldRetryAgtStatusPoll,
} from '../pollAgtSubmissionStatus';

describe('pollAgtSubmissionStatus', () => {
  it('identifica resultCode 8 como retry', () => {
    expect(shouldRetryAgtStatusPoll({ requestID: '1', resultCode: '8', taxRegistrationNumber: 'x' })).toBe(
      true
    );
  });

  it('repete até resultCode final', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ requestID: '1', resultCode: '8', taxRegistrationNumber: '5001636863' })
      .mockResolvedValueOnce({ requestID: '1', resultCode: '0', taxRegistrationNumber: '5001636863' });

    const result = await pollAgtSubmissionStatus(fetch, {
      maxAttempts: 3,
      initialDelayMs: 1,
      maxDelayMs: 2,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('ENTREGUE');
    expect(result.attempts).toBe(2);
  });

  it('devolve ENVIADO após esgotar tentativas em processamento', async () => {
    const fetch = vi.fn().mockResolvedValue({
      requestID: '1',
      resultCode: '8',
      taxRegistrationNumber: '5001636863',
    });

    const result = await pollAgtSubmissionStatus(fetch, {
      maxAttempts: 2,
      initialDelayMs: 1,
      maxDelayMs: 2,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('ENVIADO');
  });
});
