"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardStatsQuerySchema = exports.DashboardPeriodoSchema = void 0;
const zod_1 = require("zod");
exports.DashboardPeriodoSchema = zod_1.z.enum(['hoje', 'semana', 'mes']);
exports.DashboardStatsQuerySchema = zod_1.z.object({
    periodo: exports.DashboardPeriodoSchema.default('hoje'),
});
//# sourceMappingURL=dashboard.schema.js.map