"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const fiscal_immutability_middleware_1 = require("../middleware/fiscal-immutability.middleware");
const logLevels = process.env.NODE_ENV === 'production'
    ? ['warn', 'error']
    : ['query', 'info', 'warn', 'error'];
exports.prisma = global.__prisma ?? new client_1.PrismaClient({
    log: logLevels,
});
if (!global.__prisma) {
    (0, fiscal_immutability_middleware_1.withFiscalImmutability)(exports.prisma);
}
if (process.env.NODE_ENV !== 'production') {
    global.__prisma = exports.prisma;
}
