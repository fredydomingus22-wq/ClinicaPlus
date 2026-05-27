"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = auditLogger;
const logger_1 = require("../lib/logger");
/**
 * Logs all write operations (POST, PATCH, PUT, DELETE) for auditing.
 */
function auditLogger(req, res, next) {
    const start = Date.now();
    const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    // Wrap res.end to capture status code and duration after response is sent
    const originalEnd = res.end;
    // @ts-expect-error - patching res.end for logging purposes
    res.end = function (chunk, encoding, callback) {
        const durationMs = Date.now() - start;
        if (writeMethods.includes(req.method)) {
            const userId = req.user?.id;
            const clinicaId = req.user?.clinicaId || req.clinica?.id;
            // Extract resource from path (e.g., /api/pacientes -> pacientes)
            const pathParts = req.path.split('/').filter(Boolean);
            const resource = pathParts[1] || 'unknown';
            const resourceId = req.params?.id;
            logger_1.logger.info({
                type: 'audit',
                userId,
                clinicaId,
                method: req.method,
                path: req.path,
                resource,
                resourceId,
                statusCode: res.statusCode,
                durationMs,
                timestamp: new Date().toISOString(),
                ip: req.ip,
            }, `Audit: ${req.method} ${resource} by ${userId || 'anonymous'}`);
        }
        return originalEnd.call(this, chunk, encoding, callback);
    };
    next();
}
