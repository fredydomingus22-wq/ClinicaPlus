import { AgtError } from './types';

/**
 * Extrai o primeiro `idError` conhecido de respostas AGT.
 * A API pode devolver erros em formatos ligeiramente diferentes por endpoint.
 */
export function extractAgtIdError(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as any;

  if (typeof obj.idError === 'string') return obj.idError;

  const fromList =
    obj?.errorList?.[0]?.idError ||
    obj?.requestErrorList?.[0]?.idError ||
    obj?.documentStatusList?.[0]?.errorList?.[0]?.idError;

  return typeof fromList === 'string' ? fromList : undefined;
}

export type AgtErrorEntry = {
  idError: string;
  descriptionError: string;
  documentNo?: string | undefined;
};

function isErrorEntry(candidate: any): candidate is AgtErrorEntry {
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    typeof candidate.idError === 'string' &&
    typeof candidate.descriptionError === 'string'
  );
}

/**
 * Normaliza listas de erro da AGT (errorList / requestErrorList / documentStatusList[].errorList).
 */
export function extractAgtErrorEntries(data: unknown): AgtErrorEntry[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as any;

  const result: AgtErrorEntry[] = [];

  const pushFrom = (entries: any[] | undefined) => {
    for (const entry of entries || []) {
      if (isErrorEntry(entry)) {
        result.push({
          idError: entry.idError,
          descriptionError: entry.descriptionError,
          documentNo: typeof entry.documentNo === 'string' ? entry.documentNo : undefined,
        });
      }
    }
  };

  pushFrom(obj.errorList);
  pushFrom(obj.requestErrorList);

  const docStatusList: any[] | undefined = obj.documentStatusList;
  for (const doc of docStatusList || []) {
    const docNo = typeof doc?.documentNo === 'string' ? doc.documentNo : undefined;
    for (const entry of doc?.errorList || []) {
      if (isErrorEntry(entry)) {
        result.push({
          idError: entry.idError,
          descriptionError: entry.descriptionError,
          documentNo: docNo ?? (typeof entry.documentNo === 'string' ? entry.documentNo : undefined),
        });
      }
    }
  }

  return result;
}

export function extractAgtPrimaryError(data: unknown): AgtErrorEntry | undefined {
  return extractAgtErrorEntries(data)[0];
}

/**
 * Converte um HTTP error (Axios ou similar) num erro de domínio (AgtError),
 * preservando `idError` e `descriptionError` quando disponíveis.
 */
export function buildAgtErrorFromHttpResponse(status: number, data: unknown) {
  const primary = extractAgtPrimaryError(data);
  if (primary?.descriptionError) {
    return new AgtError(primary.descriptionError, status, primary.idError);
  }

  const agtCode = primary?.idError || extractAgtIdError(data);
  return AgtError.fromStatus(status, agtCode);
}
