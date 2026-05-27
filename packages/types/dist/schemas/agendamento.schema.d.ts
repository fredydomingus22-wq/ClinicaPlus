import { z } from 'zod';
import { TipoAgendamento } from '../enums';
export declare const TriagemSchema: z.ZodObject<{
    pa: z.ZodOptional<z.ZodString>;
    temperatura: z.ZodOptional<z.ZodNumber>;
    peso: z.ZodOptional<z.ZodNumber>;
    altura: z.ZodOptional<z.ZodNumber>;
    imc: z.ZodOptional<z.ZodNumber>;
    frequenciaCardiaca: z.ZodOptional<z.ZodNumber>;
    sintomas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    urgencia: z.ZodDefault<z.ZodEnum<["NORMAL", "URGENTE", "MUITO_URGENTE"]>>;
}, "strip", z.ZodTypeAny, {
    urgencia: "NORMAL" | "URGENTE" | "MUITO_URGENTE";
    pa?: string | undefined;
    temperatura?: number | undefined;
    peso?: number | undefined;
    altura?: number | undefined;
    imc?: number | undefined;
    frequenciaCardiaca?: number | undefined;
    sintomas?: string[] | undefined;
}, {
    pa?: string | undefined;
    temperatura?: number | undefined;
    peso?: number | undefined;
    altura?: number | undefined;
    imc?: number | undefined;
    frequenciaCardiaca?: number | undefined;
    sintomas?: string[] | undefined;
    urgencia?: "NORMAL" | "URGENTE" | "MUITO_URGENTE" | undefined;
}>;
export declare const AgendamentoCreateSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    dataHora: z.ZodEffects<z.ZodString, string, string>;
    duracao: z.ZodOptional<z.ZodNumber>;
    tipo: z.ZodDefault<z.ZodNativeEnum<typeof TipoAgendamento>>;
    estado: z.ZodOptional<z.ZodNativeEnum<typeof import("../enums").EstadoAgendamento>>;
    motivoConsulta: z.ZodOptional<z.ZodString>;
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    dataHora: string;
    tipo: TipoAgendamento;
    duracao?: number | undefined;
    estado?: import("../enums").EstadoAgendamento | undefined;
    motivoConsulta?: string | undefined;
    observacoes?: string | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    dataHora: string;
    duracao?: number | undefined;
    tipo?: TipoAgendamento | undefined;
    estado?: import("../enums").EstadoAgendamento | undefined;
    motivoConsulta?: string | undefined;
    observacoes?: string | undefined;
}>;
export declare const AgendamentoUpdateEstadoSchema: z.ZodObject<{
    estado: z.ZodNativeEnum<typeof import("../enums").EstadoAgendamento>;
    motivo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    estado: import("../enums").EstadoAgendamento;
    motivo?: string | undefined;
}, {
    estado: import("../enums").EstadoAgendamento;
    motivo?: string | undefined;
}>;
export declare const AgendamentoTriagemSchema: z.ZodObject<{
    pa: z.ZodOptional<z.ZodString>;
    temperatura: z.ZodOptional<z.ZodNumber>;
    peso: z.ZodOptional<z.ZodNumber>;
    altura: z.ZodOptional<z.ZodNumber>;
    imc: z.ZodOptional<z.ZodNumber>;
    frequenciaCardiaca: z.ZodOptional<z.ZodNumber>;
    sintomas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
} & {
    urgencia: z.ZodEnum<["NORMAL", "URGENTE", "MUITO_URGENTE"]>;
}, "strip", z.ZodTypeAny, {
    urgencia: "NORMAL" | "URGENTE" | "MUITO_URGENTE";
    pa?: string | undefined;
    temperatura?: number | undefined;
    peso?: number | undefined;
    altura?: number | undefined;
    imc?: number | undefined;
    frequenciaCardiaca?: number | undefined;
    sintomas?: string[] | undefined;
}, {
    urgencia: "NORMAL" | "URGENTE" | "MUITO_URGENTE";
    pa?: string | undefined;
    temperatura?: number | undefined;
    peso?: number | undefined;
    altura?: number | undefined;
    imc?: number | undefined;
    frequenciaCardiaca?: number | undefined;
    sintomas?: string[] | undefined;
}>;
export declare const AgendamentoConsultaSchema: z.ZodObject<{
    notasConsulta: z.ZodOptional<z.ZodString>;
    diagnostico: z.ZodOptional<z.ZodString>;
    finalizar: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    notasConsulta?: string | undefined;
    diagnostico?: string | undefined;
    finalizar?: boolean | undefined;
}, {
    notasConsulta?: string | undefined;
    diagnostico?: string | undefined;
    finalizar?: boolean | undefined;
}>;
export declare const AgendamentoListQuerySchema: z.ZodObject<{
    medicoId: z.ZodOptional<z.ZodString>;
    pacienteId: z.ZodOptional<z.ZodString>;
    estado: z.ZodOptional<z.ZodNativeEnum<typeof import("../enums").EstadoAgendamento>>;
    tipo: z.ZodOptional<z.ZodNativeEnum<typeof TipoAgendamento>>;
    dataInicio: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    dataFim: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    pacienteId?: string | undefined;
    medicoId?: string | undefined;
    tipo?: TipoAgendamento | undefined;
    estado?: import("../enums").EstadoAgendamento | undefined;
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    pacienteId?: string | undefined;
    medicoId?: string | undefined;
    tipo?: TipoAgendamento | undefined;
    estado?: import("../enums").EstadoAgendamento | undefined;
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
}>;
export type AgendamentoCreateInput = z.infer<typeof AgendamentoCreateSchema>;
export type AgendamentoUpdateEstadoInput = z.infer<typeof AgendamentoUpdateEstadoSchema>;
export type TriagemInput = z.infer<typeof AgendamentoTriagemSchema>;
export type ConsultaInput = z.infer<typeof AgendamentoConsultaSchema>;
export type AgendamentoListQuery = z.infer<typeof AgendamentoListQuerySchema>;
export type Triagem = z.infer<typeof TriagemSchema>;
//# sourceMappingURL=agendamento.schema.d.ts.map