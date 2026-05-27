"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logLevels = process.env.NODE_ENV === 'production'
    ? ['warn', 'error']
    : ['query', 'info', 'warn', 'error'];
exports.prisma = global.__prisma_worker ?? new client_1.PrismaClient({
    log: logLevels,
});
if (process.env.NODE_ENV !== 'production') {
    global.__prisma_worker = exports.prisma;
}
