"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRetryAgtStatusPoll = shouldRetryAgtStatusPoll;
exports.pollAgtSubmissionStatus = pollAgtSubmissionStatus;
const syncAgtSubmissionStatus_1 = require("./syncAgtSubmissionStatus");
/** resultCode 8 = ainda em processamento na fila AGT */
function shouldRetryAgtStatusPoll(statusResult) {
    return String(statusResult.resultCode) === '8';
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Polling com backoff exponencial até estado final ou esgotar tentativas.
 * @see references/compliance/async-status-qrcode.md (skill AGT FE)
 */
async function pollAgtSubmissionStatus(fetchStatus, options = {}) {
    const maxAttempts = options.maxAttempts ?? Number(process.env.AGT_POLL_MAX_ATTEMPTS || 5);
    const initialDelayMs = options.initialDelayMs ?? Number(process.env.AGT_POLL_INITIAL_MS || 1500);
    const maxDelayMs = options.maxDelayMs ?? Number(process.env.AGT_POLL_MAX_MS || 12000);
    let lastResponse = {
        requestID: '',
        resultCode: '8',
        taxRegistrationNumber: '',
    };
    let delayMs = initialDelayMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        lastResponse = await fetchStatus();
        const status = (0, syncAgtSubmissionStatus_1.mapAgtStatusToEnvio)(lastResponse);
        if (status !== 'ENVIADO' || !shouldRetryAgtStatusPoll(lastResponse)) {
            return { status, lastResponse, attempts: attempt };
        }
        if (attempt < maxAttempts) {
            await sleep(delayMs);
            delayMs = Math.min(delayMs * 2, maxDelayMs);
        }
    }
    return {
        status: (0, syncAgtSubmissionStatus_1.mapAgtStatusToEnvio)(lastResponse),
        lastResponse,
        attempts: maxAttempts,
    };
}
//# sourceMappingURL=pollAgtSubmissionStatus.js.map