import { describe, expect, it } from 'vitest';
import { buildAgtFailurePayload, isAgtBusinessFailure, mapAgtSeriesItems } from '../agtResponse';

describe('agtResponse', () => {
  it('trata errorList da AGT como falha mesmo com HTTP 200', () => {
    const response = {
      resultCode: '0',
      errorList: [
        {
          idError: 'E07',
          descriptionError: 'Software de facturação especificado não está certificado.',
        },
      ],
    };

    expect(isAgtBusinessFailure(response, ['1'])).toBe(true);
    expect(buildAgtFailurePayload(response, 'Falha na AGT')).toEqual({
      error: 'Software de facturação especificado não está certificado.',
      code: 'E07',
      resultCode: '0',
      agtErrors: [
        {
          idError: 'E07',
          descriptionError: 'Software de facturação especificado não está certificado.',
          documentNo: undefined,
        },
      ],
    });
  });

  it('mapeia seriesInfo válido e ignora entradas vazias devolvidas pela AGT', () => {
    const items = mapAgtSeriesItems({
      resultCode: '1',
      seriesInfo: [
        '',
        {
          seriesCode: 'FT2026',
          documentType: 'FT',
          authorizedQuantity: '1000',
          usedQuantity: '25',
          seriesStatus: 'U',
        },
      ],
    });

    expect(items).toEqual([
      {
        id: 'FT2026',
        serieCode: 'FT2026',
        documentType: 'FT',
        authorizedQuantity: 1000,
        availableQuantity: 975,
        status: 'ACTIVE',
      },
    ]);
  });

  it('mantém fallback para documentStatusList usado pelo mock antigo', () => {
    expect(
      mapAgtSeriesItems({
        resultCode: '1',
        documentStatusList: [{ documentNo: 'CPLS-FT-0001', documentStatus: 'A', document: null }],
      })
    ).toEqual([
      {
        id: 'CPLS-FT-0001',
        serieCode: 'CPLS',
        documentType: 'FT',
        authorizedQuantity: 0,
        availableQuantity: 0,
        status: 'ACTIVE',
      },
    ]);
  });
});
