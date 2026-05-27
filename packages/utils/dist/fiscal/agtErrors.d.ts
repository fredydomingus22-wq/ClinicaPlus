import { AgtError } from './types';
/**
 * Extrai o primeiro `idError` conhecido de respostas AGT.
 * A API pode devolver erros em formatos ligeiramente diferentes por endpoint.
 */
export declare function extractAgtIdError(data: unknown): string | undefined;
export type AgtErrorEntry = {
    idError: string;
    descriptionError: string;
    documentNo?: string | undefined;
};
/**
 * Normaliza listas de erro da AGT (errorList / requestErrorList / documentStatusList[].errorList).
 */
export declare function extractAgtErrorEntries(data: unknown): AgtErrorEntry[];
export declare function extractAgtPrimaryError(data: unknown): AgtErrorEntry | undefined;
/**
 * Converte um HTTP error (Axios ou similar) num erro de domínio (AgtError),
 * preservando `idError` e `descriptionError` quando disponíveis.
 */
export declare function buildAgtErrorFromHttpResponse(status: number, data: unknown): AgtError;
//# sourceMappingURL=agtErrors.d.ts.map