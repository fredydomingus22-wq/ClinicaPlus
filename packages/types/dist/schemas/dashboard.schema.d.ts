import { z } from 'zod';
export declare const DashboardPeriodoSchema: z.ZodEnum<["hoje", "semana", "mes"]>;
export declare const DashboardStatsQuerySchema: z.ZodObject<{
    periodo: z.ZodDefault<z.ZodEnum<["hoje", "semana", "mes"]>>;
}, "strip", z.ZodTypeAny, {
    periodo: "hoje" | "semana" | "mes";
}, {
    periodo?: "hoje" | "semana" | "mes" | undefined;
}>;
export type DashboardPeriodo = z.infer<typeof DashboardPeriodoSchema>;
export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;
//# sourceMappingURL=dashboard.schema.d.ts.map