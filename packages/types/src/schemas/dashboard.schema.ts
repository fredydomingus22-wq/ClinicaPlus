import { z } from 'zod';

export const DashboardPeriodoSchema = z.enum(['hoje', 'semana', 'mes']);

export const DashboardStatsQuerySchema = z.object({
  periodo: DashboardPeriodoSchema.default('hoje'),
});

export type DashboardPeriodo = z.infer<typeof DashboardPeriodoSchema>;
export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;
