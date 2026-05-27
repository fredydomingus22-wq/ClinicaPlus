import { z } from 'zod';
import { TipoExame } from '../enums';
export declare const ProntuarioSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notas: z.ZodString;
    diagnostico: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    criadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    atualizadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    notas: string;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    diagnostico?: string | null | undefined;
    agendamentoId?: string | null | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    notas: string;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    diagnostico?: string | null | undefined;
    agendamentoId?: string | null | undefined;
}>;
export declare const ProntuarioCreateSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodOptional<z.ZodString>;
    notas: z.ZodString;
    diagnostico: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    notas: string;
    diagnostico?: string | undefined;
    agendamentoId?: string | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    notas: string;
    diagnostico?: string | undefined;
    agendamentoId?: string | undefined;
}>;
export declare const ExameSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    nome: z.ZodString;
    tipo: z.ZodNativeEnum<typeof TipoExame>;
    status: z.ZodString;
    resultado: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dataPedido: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    dataResultado: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>>;
    criadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    atualizadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    status: string;
    nome: string;
    pacienteId: string;
    medicoId: string;
    tipo: TipoExame;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    dataPedido: string | Date;
    agendamentoId?: string | null | undefined;
    resultado?: string | null | undefined;
    dataResultado?: string | Date | null | undefined;
}, {
    status: string;
    nome: string;
    pacienteId: string;
    medicoId: string;
    tipo: TipoExame;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    dataPedido: string | Date;
    agendamentoId?: string | null | undefined;
    resultado?: string | null | undefined;
    dataResultado?: string | Date | null | undefined;
}>;
export declare const AnamneseSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    especialidade: z.ZodString;
    respostas: z.ZodRecord<z.ZodString, z.ZodAny>;
    criadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
    atualizadoEm: z.ZodUnion<[z.ZodDate, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    especialidade: string;
    respostas: Record<string, any>;
    agendamentoId?: string | null | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    id: string;
    criadoEm: string | Date;
    clinicaId: string;
    atualizadoEm: string | Date;
    especialidade: string;
    respostas: Record<string, any>;
    agendamentoId?: string | null | undefined;
}>;
export declare const AnamneseCreateSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodOptional<z.ZodString>;
    especialidade: z.ZodDefault<z.ZodString>;
    respostas: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    especialidade: string;
    respostas: Record<string, any>;
    agendamentoId?: string | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    respostas: Record<string, any>;
    agendamentoId?: string | undefined;
    especialidade?: string | undefined;
}>;
export declare const AnamneseUpdateSchema: z.ZodObject<{
    respostas: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    respostas: Record<string, any>;
}, {
    respostas: Record<string, any>;
}>;
export declare const ExameCreateSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodOptional<z.ZodString>;
    nome: z.ZodString;
    tipo: z.ZodNativeEnum<typeof TipoExame>;
    status: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    nome: string;
    pacienteId: string;
    medicoId: string;
    tipo: TipoExame;
    agendamentoId?: string | undefined;
}, {
    nome: string;
    pacienteId: string;
    medicoId: string;
    tipo: TipoExame;
    status?: string | undefined;
    agendamentoId?: string | undefined;
}>;
export type AnamneseDTO = z.infer<typeof AnamneseSchema>;
export type AnamneseCreateInput = z.infer<typeof AnamneseCreateSchema>;
export type AnamneseUpdateInput = z.infer<typeof AnamneseUpdateSchema>;
export type ProntuarioCreateInput = z.infer<typeof ProntuarioCreateSchema>;
export type ExameCreateInput = z.infer<typeof ExameCreateSchema>;
//# sourceMappingURL=clinical.schema.d.ts.map