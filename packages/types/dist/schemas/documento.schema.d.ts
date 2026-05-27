import { z } from 'zod';
export declare const DocumentoSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    pacienteId: z.ZodString;
    medicoId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    agendamentoId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tipo: z.ZodNativeEnum<typeof import("../enums").TipoDocumento>;
    nome: z.ZodString;
    url: z.ZodString;
    criadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    pacienteId: string;
    tipo: import("../enums").TipoDocumento;
    id: string;
    url: string;
    criadoEm: string | Date;
    clinicaId: string;
    medicoId?: string | null | undefined;
    agendamentoId?: string | null | undefined;
}, {
    nome: string;
    pacienteId: string;
    tipo: import("../enums").TipoDocumento;
    id: string;
    url: string;
    criadoEm: string | Date;
    clinicaId: string;
    medicoId?: string | null | undefined;
    agendamentoId?: string | null | undefined;
}>;
export declare const DocumentoCreateSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodOptional<z.ZodString>;
    agendamentoId: z.ZodOptional<z.ZodString>;
    tipo: z.ZodNativeEnum<typeof import("../enums").TipoDocumento>;
    nome: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nome: string;
    pacienteId: string;
    tipo: import("../enums").TipoDocumento;
    url: string;
    medicoId?: string | undefined;
    agendamentoId?: string | undefined;
}, {
    nome: string;
    pacienteId: string;
    tipo: import("../enums").TipoDocumento;
    url: string;
    medicoId?: string | undefined;
    agendamentoId?: string | undefined;
}>;
export type DocumentoCreateInput = z.infer<typeof DocumentoCreateSchema>;
//# sourceMappingURL=documento.schema.d.ts.map