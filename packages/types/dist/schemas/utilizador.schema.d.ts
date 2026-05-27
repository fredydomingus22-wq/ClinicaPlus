import { z } from 'zod';
export declare const UtilizadorCreateSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    papel: z.ZodNativeEnum<typeof import("../enums").Papel>;
    ativo: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    email: string;
    nome: string;
    password: string;
    papel: import("../enums").Papel;
}, {
    email: string;
    nome: string;
    password: string;
    papel: import("../enums").Papel;
    ativo?: boolean | undefined;
}>;
export declare const UtilizadorUpdateSchema: z.ZodObject<{
    ativo: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    email: z.ZodOptional<z.ZodString>;
    nome: z.ZodOptional<z.ZodString>;
    papel: z.ZodOptional<z.ZodNativeEnum<typeof import("../enums").Papel>>;
}, "strip", z.ZodTypeAny, {
    ativo?: boolean | undefined;
    email?: string | undefined;
    nome?: string | undefined;
    papel?: import("../enums").Papel | undefined;
}, {
    ativo?: boolean | undefined;
    email?: string | undefined;
    nome?: string | undefined;
    papel?: import("../enums").Papel | undefined;
}>;
export declare const UtilizadorListQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    papel: z.ZodOptional<z.ZodNativeEnum<typeof import("../enums").Papel>>;
    ativo: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    ativo?: boolean | undefined;
    q?: string | undefined;
    papel?: import("../enums").Papel | undefined;
}, {
    ativo?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    q?: string | undefined;
    papel?: import("../enums").Papel | undefined;
}>;
export declare const EquipaCreateSchema: z.ZodObject<Omit<{
    nome: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    papel: z.ZodNativeEnum<typeof import("../enums").Papel>;
    ativo: z.ZodDefault<z.ZodBoolean>;
}, "password">, "strip", z.ZodTypeAny, {
    ativo: boolean;
    email: string;
    nome: string;
    papel: import("../enums").Papel;
}, {
    email: string;
    nome: string;
    papel: import("../enums").Papel;
    ativo?: boolean | undefined;
}>;
export type UtilizadorCreateInput = z.infer<typeof UtilizadorCreateSchema>;
export type UtilizadorUpdateInput = z.infer<typeof UtilizadorUpdateSchema>;
export type UtilizadorListQuery = z.infer<typeof UtilizadorListQuerySchema>;
export type EquipaCreateInput = z.infer<typeof EquipaCreateSchema>;
//# sourceMappingURL=utilizador.schema.d.ts.map