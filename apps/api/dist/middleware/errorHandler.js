"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const AppError_1 = require("../lib/AppError");
const logger_1 = require("../lib/logger");
const config_1 = require("../lib/config");
const metrics_1 = require("../lib/metrics");
const alerting_1 = require("../lib/alerting");
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    // Global error handler
    // Ensure CORS headers for browser safety, even if the error happens before the cors middleware
    const origin = req.headers.origin;
    if (origin &&
        (origin === config_1.config.FRONTEND_URL ||
            (config_1.config.NODE_ENV === "development" && origin.includes("localhost")))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-metrics-token");
    }
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code,
            },
        });
        return;
    }
    if (err instanceof zod_1.ZodError || err.name === "ZodError") {
        const zodErr = err;
        if (config_1.config.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log('❌ Zod Validation Error:', JSON.stringify({
                path: req.path,
                method: req.method,
                query: req.query,
                body: req.body,
                issues: zodErr.issues
            }, null, 2));
        }
        res.status(400).json({
            success: false,
            error: {
                message: "Os dados enviados são inválidos ou estão incompletos. Por favor, verifique os campos.",
                code: "VALIDATION_ERROR",
                details: zodErr.issues.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                })),
            },
        });
        return;
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            res.status(409).json({
                success: false,
                error: {
                    message: "Esta informação já se encontra registada no nosso sistema. Por favor, verifique se está a tentar criar um duplicado.",
                    code: "DUPLICATE_ENTRY",
                },
            });
            return;
        }
        if (err.code === "P2025") {
            res.status(404).json({
                success: false,
                error: {
                    message: "Não conseguimos encontrar o registo solicitado. Por favor, confirme se os dados estão corretos.",
                    code: "NOT_FOUND",
                },
            });
            return;
        }
    }
    // Structured error logging
    const isInternalError = !res.statusCode || res.statusCode >= 500;
    const isDebug = config_1.config.NODE_ENV !== "production" || process.env["DEBUG"];
    if (isInternalError || isDebug) {
        if (isInternalError) {
            metrics_1.systemMetrics.errors_5xx_total++;
            (0, alerting_1.sendCriticalAlert)("Server Error", `${err.message}\n${req.method} ${req.path}\nUser: ${req.user?.id || "N/A"}\nClinica: ${req.clinica?.id || "N/A"}`);
        }
        logger_1.logger.error({
            type: "error",
            err: {
                message: err.message,
                stack: isInternalError ? err.stack : undefined,
                code: err.code ||
                    err.name ||
                    "UNKNOWN_ERROR",
            },
            request: {
                method: req.method,
                path: req.path,
                userId: req.user?.id,
                clinicaId: req.user?.clinicaId || req.clinica?.id,
            },
        }, `Error ${res.statusCode || 500}: ${err.message}`);
    }
    res.status(500).json({
        success: false,
        error: {
            message: "Lamentamos, mas ocorreu um erro inesperado no sistema. Por favor, tente novamente mais tarde ou contacte o suporte técnico.",
            code: "INTERNAL_ERROR",
            ...(config_1.config.NODE_ENV !== "production" && { details: err.message }),
        },
    });
}
