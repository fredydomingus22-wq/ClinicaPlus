import { describe, it, expect } from 'vitest';
import { resolveCustomerCountry } from '../resolveCustomerCountry';

describe('resolveCustomerCountry', () => {
  it('usa país explícito quando fornecido', () => {
    expect(resolveCustomerCountry('5001636863', 'pt')).toBe('PT');
  });

  it('infere PT de NIF com prefixo VAT', () => {
    expect(resolveCustomerCountry('PT987654321')).toBe('PT');
  });

  it('assume AO para NIF angolano numérico', () => {
    expect(resolveCustomerCountry('5001636863')).toBe('AO');
  });

  it('usa fallback para consumidor final', () => {
    expect(resolveCustomerCountry('999999999')).toBe('AO');
  });
});
