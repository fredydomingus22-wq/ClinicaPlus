import { extractAgtErrorEntries, type AgtErrorEntry } from '@clinicaplus/utils/server';

export type AgtFailurePayload = {
  error: string;
  code?: string;
  resultCode?: string | number;
  agtErrors: AgtErrorEntry[];
};

export type AgtSeriesItem = {
  id: string;
  serieCode: string;
  documentType: string;
  authorizedQuantity: number;
  availableQuantity: number;
  status: 'ACTIVE' | 'EXPIRED';
};

type AgtResponseLike = {
  resultCode?: string | number;
  documentStatusList?: unknown[];
  seriesInfo?: unknown[];
  seriesFEResult?: unknown;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function isAgtBusinessFailure(response: unknown, successResultCodes: Array<string | number>): boolean {
  if (!isPlainRecord(response)) return false;

  if (extractAgtErrorEntries(response).length > 0) return true;

  if (!('resultCode' in response)) return false;
  const resultCode = String(response.resultCode);
  return !successResultCodes.map(String).includes(resultCode);
}

export function buildAgtFailurePayload(response: unknown, fallbackMessage: string): AgtFailurePayload {
  const errors = extractAgtErrorEntries(response);
  const primary = errors[0];
  const resultCode = isPlainRecord(response) ? response.resultCode as string | number | undefined : undefined;

  const payload: AgtFailurePayload = {
    error: primary?.descriptionError || fallbackMessage,
    agtErrors: errors,
  };

  if (primary?.idError) payload.code = primary.idError;
  if (resultCode !== undefined) payload.resultCode = resultCode;

  return payload;
}

export function mapAgtSeriesItems(response: AgtResponseLike): AgtSeriesItem[] {
  const fromSeriesInfo = (response.seriesInfo || [])
    .filter(isPlainRecord)
    .map((serie) => {
      const serieCode =
        toOptionalString(serie.seriesCode) ||
        toOptionalString(serie.serieCode) ||
        toOptionalString(serie.seriesNumber) ||
        'N/A';
      const documentType = toOptionalString(serie.documentType) || 'FT';
      const authorizedQuantity =
        toNumber(serie.authorizedQuantity) ||
        toNumber(serie.lastDocumentApproved) ||
        toNumber(serie.lastDocumentNo);
      const usedQuantity = toNumber(serie.usedQuantity) || toNumber(serie.lastDocumentIssued);
      const statusCode = toOptionalString(serie.seriesStatus) || toOptionalString(serie.status);

      return {
        id: serieCode,
        serieCode,
        documentType,
        authorizedQuantity,
        availableQuantity: Math.max(authorizedQuantity - usedQuantity, 0),
        status: statusCode === 'A' || statusCode === 'U' || statusCode === 'ACTIVE' ? 'ACTIVE' : 'EXPIRED',
      } satisfies AgtSeriesItem;
    });

  if (fromSeriesInfo.length > 0) return fromSeriesInfo;

  return (response.documentStatusList || [])
    .filter(isPlainRecord)
    .map((doc) => {
      const documentNo = toOptionalString(doc.documentNo) || toOptionalString(doc.requestID) || 'N/A';
      const [serieCode = 'N/A', documentType = 'FT'] = documentNo.split('-');
      return {
        id: documentNo,
        serieCode,
        documentType,
        authorizedQuantity: 0,
        availableQuantity: 0,
        status: doc.documentStatus === 'A' || doc.documentStatus === 'U' ? 'ACTIVE' : 'EXPIRED',
      } satisfies AgtSeriesItem;
    });
}
