import { describe, it, expect } from 'vitest';
import { mapAgtStatusToEnvio } from '../syncAgtSubmissionStatus';

describe('mapAgtStatusToEnvio', () => {
  it('mapeia resultCode 0 para ENTREGUE', () => {
    expect(
      mapAgtStatusToEnvio({
        requestID: '1',
        resultCode: '0',
        taxRegistrationNumber: '5001636863',
      })
    ).toBe('ENTREGUE');
  });

  it('mapeia resultCode 2 para ERRO', () => {
    expect(
      mapAgtStatusToEnvio({
        requestID: '1',
        resultCode: '2',
        taxRegistrationNumber: '5001636863',
      })
    ).toBe('ERRO');
  });

  it('mapeia documentStatusList com V para ENTREGUE', () => {
    expect(
      mapAgtStatusToEnvio({
        requestID: '1',
        resultCode: '1',
        taxRegistrationNumber: '5001636863',
        documentStatusList: [{ documentNo: 'FT X/1', documentStatus: 'V' }],
      })
    ).toBe('ENTREGUE');
  });
});
