"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', metadata) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        if (metadata) {
            this.metadata = metadata;
        }
        // Maintain proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AppError = AppError;
//# sourceMappingURL=errors.js.map