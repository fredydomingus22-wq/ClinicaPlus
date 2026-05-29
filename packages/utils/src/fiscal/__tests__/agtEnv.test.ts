import { describe, expect, it } from 'vitest';
import { resolveAgtEnvFromProcessEnv } from '../agtEnv';

describe('resolveAgtEnvFromProcessEnv', () => {
  it('usa AGT_ENV como fonte principal', () => {
    expect(resolveAgtEnvFromProcessEnv({ AGT_ENV: 'sandbox', NODE_ENV: 'production' })).toBe('sandbox');
    expect(resolveAgtEnvFromProcessEnv({ AGT_ENV: 'production', NODE_ENV: 'development' })).toBe('production');
  });

  it('força sandbox quando AGT_SANDBOX=true', () => {
    expect(resolveAgtEnvFromProcessEnv({ AGT_SANDBOX: 'true', NODE_ENV: 'production' })).toBe('sandbox');
  });

  it('usa NODE_ENV apenas quando AGT_ENV e AGT_SANDBOX não estão definidos', () => {
    expect(resolveAgtEnvFromProcessEnv({ NODE_ENV: 'production' })).toBe('production');
    expect(resolveAgtEnvFromProcessEnv({ NODE_ENV: 'development' })).toBe('sandbox');
    expect(resolveAgtEnvFromProcessEnv({})).toBe('sandbox');
  });
});
