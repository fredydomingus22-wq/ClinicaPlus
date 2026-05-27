import { z } from 'zod';
export declare const OdontogramaMarcacaoSchema: z.ZodObject<{
    numeroDente: z.ZodNumber;
    face: z.ZodNativeEnum<typeof import("../enums").DenteFace>;
    status: z.ZodNativeEnum<typeof import("../enums").DenteStatus>;
    observacao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: import("../enums").DenteStatus;
    numeroDente: number;
    face: import("../enums").DenteFace;
    observacao?: string | undefined;
}, {
    status: import("../enums").DenteStatus;
    numeroDente: number;
    face: import("../enums").DenteFace;
    observacao?: string | undefined;
}>;
export declare const OdontogramaSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodString;
    marcacoes: z.ZodArray<z.ZodObject<{
        numeroDente: z.ZodNumber;
        face: z.ZodNativeEnum<typeof import("../enums").DenteFace>;
        status: z.ZodNativeEnum<typeof import("../enums").DenteStatus>;
        observacao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }, {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }>, "many">;
    criadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    atualizadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    agendamentoId: string;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    marcacoes: {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }[];
}, {
    pacienteId: string;
    medicoId: string;
    agendamentoId: string;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    marcacoes: {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }[];
}>;
export declare const OdontogramaCreateSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodString;
    marcacoes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        numeroDente: z.ZodNumber;
        face: z.ZodNativeEnum<typeof import("../enums").DenteFace>;
        status: z.ZodNativeEnum<typeof import("../enums").DenteStatus>;
        observacao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }, {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    agendamentoId: string;
    marcacoes: {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }[];
}, {
    pacienteId: string;
    medicoId: string;
    agendamentoId: string;
    marcacoes?: {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }[] | undefined;
}>;
export declare const OdontogramaUpdateSchema: z.ZodObject<{
    marcacoes: z.ZodArray<z.ZodObject<{
        numeroDente: z.ZodNumber;
        face: z.ZodNativeEnum<typeof import("../enums").DenteFace>;
        status: z.ZodNativeEnum<typeof import("../enums").DenteStatus>;
        observacao: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }, {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    marcacoes: {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }[];
}, {
    marcacoes: {
        status: import("../enums").DenteStatus;
        numeroDente: number;
        face: import("../enums").DenteFace;
        observacao?: string | undefined;
    }[];
}>;
export type OdontogramaMarcacao = z.infer<typeof OdontogramaMarcacaoSchema>;
export type OdontogramaDTO = z.infer<typeof OdontogramaSchema>;
export type OdontogramaCreateInput = z.infer<typeof OdontogramaCreateSchema>;
export type OdontogramaUpdateInput = z.infer<typeof OdontogramaUpdateSchema>;
//# sourceMappingURL=odontograma.schema.d.ts.map