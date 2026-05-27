import { z } from 'zod';
export declare const MedicamentoSchema: z.ZodObject<{
    nome: z.ZodString;
    dosagem: z.ZodString;
    frequencia: z.ZodString;
    duracao: z.ZodString;
    instrucoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    duracao: string;
    dosagem: string;
    frequencia: string;
    instrucoes?: string | undefined;
}, {
    nome: string;
    duracao: string;
    dosagem: string;
    frequencia: string;
    instrucoes?: string | undefined;
}>;
export declare const ReceitaCreateSchema: z.ZodObject<{
    agendamentoId: z.ZodString;
    diagnostico: z.ZodString;
    medicamentos: z.ZodArray<z.ZodObject<{
        nome: z.ZodString;
        dosagem: z.ZodString;
        frequencia: z.ZodString;
        duracao: z.ZodString;
        instrucoes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        nome: string;
        duracao: string;
        dosagem: string;
        frequencia: string;
        instrucoes?: string | undefined;
    }, {
        nome: string;
        duracao: string;
        dosagem: string;
        frequencia: string;
        instrucoes?: string | undefined;
    }>, "many">;
    observacoes: z.ZodOptional<z.ZodString>;
    dataValidade: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    diagnostico: string;
    agendamentoId: string;
    medicamentos: {
        nome: string;
        duracao: string;
        dosagem: string;
        frequencia: string;
        instrucoes?: string | undefined;
    }[];
    dataValidade: string;
    observacoes?: string | undefined;
}, {
    diagnostico: string;
    agendamentoId: string;
    medicamentos: {
        nome: string;
        duracao: string;
        dosagem: string;
        frequencia: string;
        instrucoes?: string | undefined;
    }[];
    dataValidade: string;
    observacoes?: string | undefined;
}>;
export declare const ReceitaListQuerySchema: z.ZodObject<{
    pacienteId: z.ZodOptional<z.ZodString>;
    medicoId: z.ZodOptional<z.ZodString>;
    valida: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    pacienteId?: string | undefined;
    medicoId?: string | undefined;
    valida?: boolean | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    pacienteId?: string | undefined;
    medicoId?: string | undefined;
    valida?: boolean | undefined;
}>;
export type ReceitaCreateInput = z.infer<typeof ReceitaCreateSchema>;
export type ReceitaListQuery = z.infer<typeof ReceitaListQuerySchema>;
export type Medicamento = z.infer<typeof MedicamentoSchema>;
//# sourceMappingURL=receita.schema.d.ts.map