import { z } from 'zod';
export declare const EspecialidadeCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    ativo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    descricao?: string | undefined;
}, {
    nome: string;
    ativo?: boolean | undefined;
    descricao?: string | undefined;
}>;
export declare const EspecialidadeUpdateSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    descricao: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ativo: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    ativo?: boolean | undefined;
    nome?: string | undefined;
    descricao?: string | undefined;
}, {
    ativo?: boolean | undefined;
    nome?: string | undefined;
    descricao?: string | undefined;
}>;
export declare const EspecialidadeListQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    ativo: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    ativo?: boolean | undefined;
    q?: string | undefined;
}, {
    ativo?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    q?: string | undefined;
}>;
export type EspecialidadeCreateInput = z.infer<typeof EspecialidadeCreateSchema>;
export type EspecialidadeUpdateInput = z.infer<typeof EspecialidadeUpdateSchema>;
export type EspecialidadeListQuery = z.infer<typeof EspecialidadeListQuerySchema>;
//# sourceMappingURL=especialidade.schema.d.ts.map