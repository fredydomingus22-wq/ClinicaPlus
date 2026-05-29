import { describe, expect, it } from 'vitest';
import { getAgtEndpointUrl, getAgtOrigin } from '../agtEndpoints';

describe('agtEndpoints', () => {
  it('deve apontar sandbox para o ambiente de homologacao da AGT', () => {
    expect(getAgtOrigin('sandbox')).toBe('https://sifphml.minfin.gov.ao');
    expect(getAgtEndpointUrl('sandbox', 'registarFactura')).toBe(
      'https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura'
    );
  });

  it('deve apontar production para o ambiente produtivo da AGT', () => {
    expect(getAgtOrigin('production')).toBe('https://sifp.minfin.gov.ao');
    expect(getAgtEndpointUrl('production', 'obterEstado')).toBe(
      'https://sifp.minfin.gov.ao/sigt/fe/v1/obterEstado'
    );
  });
});
