"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAgtIdError = extractAgtIdError;
exports.extractAgtErrorEntries = extractAgtErrorEntries;
exports.extractAgtPrimaryError = extractAgtPrimaryError;
exports.buildAgtErrorFromHttpResponse = buildAgtErrorFromHttpResponse;
const types_1 = require("./types");
/**
 * Extrai o primeiro `idError` conhecido de respostas AGT.
 * A API pode devolver erros em formatos ligeiramente diferentes por endpoint.
 */
function extractAgtIdError(data) {
    if (!data || typeof data !== 'object')
        return undefined;
    const obj = data;
    if (typeof obj.idError === 'string')
        return obj.idError;
    const fromList = obj?.errorList?.[0]?.idError ||
        obj?.requestErrorList?.[0]?.idError ||
        obj?.documentStatusList?.[0]?.errorList?.[0]?.idError;
    return typeof fromList === 'string' ? fromList : undefined;
}
function isErrorEntry(candidate) {
    return (!!candidate &&
        typeof candidate === 'object' &&
        typeof candidate.idError === 'string' &&
        typeof candidate.descriptionError === 'string');
}
/**
 * Normaliza listas de erro da AGT (errorList / requestErrorList / documentStatusList[].errorList).
 */
function extractAgtErrorEntries(data) {
    if (!data || typeof data !== 'object')
        return [];
    const obj = data;
    const result = [];
    const pushFrom = (entries) => {
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
    const docStatusList = obj.documentStatusList;
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
function extractAgtPrimaryError(data) {
    return extractAgtErrorEntries(data)[0];
}
/**
 * Converte um HTTP error (Axios ou similar) num erro de domínio (AgtError),
 * preservando `idError` e `descriptionError` quando disponíveis.
 */
function buildAgtErrorFromHttpResponse(status, data) {
    const primary = extractAgtPrimaryError(data);
    if (primary?.descriptionError) {
        return new types_1.AgtError(primary.descriptionError, status, primary.idError);
    }
    const agtCode = primary?.idError || extractAgtIdError(data);
    return types_1.AgtError.fromStatus(status, agtCode);
}
//# sourceMappingURL=agtErrors.js.map