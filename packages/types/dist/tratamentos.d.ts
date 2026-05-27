import { z } from 'zod';
export declare const EstadoExameSchema: z.ZodEnum<["PENDENTE", "AGENDADO", "REALIZADO", "LAUDADO", "CANCELADO"]>;
export type EstadoExame = z.infer<typeof EstadoExameSchema>;
export declare const CriarExameSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    agendamentoId: z.ZodOptional<z.ZodString>;
    tipoExameId: z.ZodOptional<z.ZodString>;
    descricao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    agendamentoId?: string | undefined;
    descricao?: string | undefined;
    tipoExameId?: string | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    agendamentoId?: string | undefined;
    descricao?: string | undefined;
    tipoExameId?: string | undefined;
}>;
export type CriarExameDto = z.infer<typeof CriarExameSchema>;
export declare const AtualizarExameSchema: z.ZodObject<{
    estado: z.ZodOptional<z.ZodEnum<["PENDENTE", "AGENDADO", "REALIZADO", "LAUDADO", "CANCELADO"]>>;
    dataRealizacao: z.ZodOptional<z.ZodDate>;
    laudoNota: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    estado?: "PENDENTE" | "CANCELADO" | "AGENDADO" | "REALIZADO" | "LAUDADO" | undefined;
    dataRealizacao?: Date | undefined;
    laudoNota?: string | undefined;
}, {
    estado?: "PENDENTE" | "CANCELADO" | "AGENDADO" | "REALIZADO" | "LAUDADO" | undefined;
    dataRealizacao?: Date | undefined;
    laudoNota?: string | undefined;
}>;
export type AtualizarExameDto = z.infer<typeof AtualizarExameSchema>;
export declare const EstadoPlanoSchema: z.ZodEnum<["ACTIVO", "SUSPENSO", "CONCLUIDO", "CANCELADO"]>;
export type EstadoPlano = z.infer<typeof EstadoPlanoSchema>;
export declare const CriarPlanoSchema: z.ZodObject<{
    pacienteId: z.ZodString;
    agendamentoOrigemId: z.ZodOptional<z.ZodString>;
    medicoId: z.ZodString;
    responsavelId: z.ZodOptional<z.ZodString>;
    tipoId: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    totalSessoes: z.ZodNumber;
    frequenciaSemana: z.ZodNumber;
    dataInicio: z.ZodDate;
    duracaoSessaoMin: z.ZodNumber;
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    dataInicio: Date;
    tipoId: string;
    totalSessoes: number;
    frequenciaSemana: number;
    duracaoSessaoMin: number;
    observacoes?: string | undefined;
    descricao?: string | undefined;
    agendamentoOrigemId?: string | undefined;
    responsavelId?: string | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    dataInicio: Date;
    tipoId: string;
    totalSessoes: number;
    frequenciaSemana: number;
    duracaoSessaoMin: number;
    observacoes?: string | undefined;
    descricao?: string | undefined;
    agendamentoOrigemId?: string | undefined;
    responsavelId?: string | undefined;
}>;
export type CriarPlanoDto = z.infer<typeof CriarPlanoSchema>;
export declare const AtualizarPlanoSchema: z.ZodObject<{
    estado: z.ZodOptional<z.ZodEnum<["ACTIVO", "SUSPENSO", "CONCLUIDO", "CANCELADO"]>>;
    observacoes: z.ZodOptional<z.ZodString>;
    dataFimReal: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    estado?: "CONCLUIDO" | "CANCELADO" | "ACTIVO" | "SUSPENSO" | undefined;
    observacoes?: string | undefined;
    dataFimReal?: Date | undefined;
}, {
    estado?: "CONCLUIDO" | "CANCELADO" | "ACTIVO" | "SUSPENSO" | undefined;
    observacoes?: string | undefined;
    dataFimReal?: Date | undefined;
}>;
export type AtualizarPlanoDto = z.infer<typeof AtualizarPlanoSchema>;
export declare const EstadoSessaoSchema: z.ZodEnum<["AGENDADO", "REALIZADO", "FALTOU", "CANCELADO"]>;
export type EstadoSessao = z.infer<typeof EstadoSessaoSchema>;
export declare const AtualizarSessaoSchema: z.ZodObject<{
    estado: z.ZodOptional<z.ZodEnum<["AGENDADO", "REALIZADO", "FALTOU", "CANCELADO"]>>;
    notas: z.ZodOptional<z.ZodString>;
    dataHora: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    dataHora?: Date | undefined;
    estado?: "CANCELADO" | "AGENDADO" | "REALIZADO" | "FALTOU" | undefined;
    notas?: string | undefined;
}, {
    dataHora?: Date | undefined;
    estado?: "CANCELADO" | "AGENDADO" | "REALIZADO" | "FALTOU" | undefined;
    notas?: string | undefined;
}>;
export type AtualizarSessaoDto = z.infer<typeof AtualizarSessaoSchema>;
export declare const TipoExameClinicaSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preco: z.ZodNumber;
    ativo: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    preco: number;
    id: string;
    clinicaId: string;
    descricao?: string | null | undefined;
}, {
    ativo: boolean;
    nome: string;
    preco: number;
    id: string;
    clinicaId: string;
    descricao?: string | null | undefined;
}>;
export type TipoExameClinicaDTO = z.infer<typeof TipoExameClinicaSchema>;
export declare const TipoTratamentoSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    duracaoMin: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    preco: z.ZodNumber;
    ativo: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    preco: number;
    id: string;
    clinicaId: string;
    descricao?: string | null | undefined;
    duracaoMin?: number | null | undefined;
}, {
    ativo: boolean;
    nome: string;
    preco: number;
    id: string;
    clinicaId: string;
    descricao?: string | null | undefined;
    duracaoMin?: number | null | undefined;
}>;
export type TipoTratamentoDTO = z.infer<typeof TipoTratamentoSchema>;
export declare const PlanoTratamentoSchema: z.ZodObject<{
    id: z.ZodString;
    clinicaId: z.ZodString;
    pacienteId: z.ZodString;
    medicoId: z.ZodString;
    tipoId: z.ZodString;
    totalSessoes: z.ZodNumber;
    frequenciaSemana: z.ZodNumber;
    sessoesRealizadas: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dataInicio: z.ZodString;
    dataFimPrevista: z.ZodString;
    dataFimReal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    estado: z.ZodString;
    descricao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    observacoes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    agendamentoOrigemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responsavelId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    criadoEm: z.ZodString;
    atualizadoEm: z.ZodString;
    tipoTratamento: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        clinicaId: z.ZodString;
        nome: z.ZodString;
        descricao: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        duracaoMin: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        preco: z.ZodNumber;
        ativo: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        ativo: boolean;
        nome: string;
        preco: number;
        id: string;
        clinicaId: string;
        descricao?: string | null | undefined;
        duracaoMin?: number | null | undefined;
    }, {
        ativo: boolean;
        nome: string;
        preco: number;
        id: string;
        clinicaId: string;
        descricao?: string | null | undefined;
        duracaoMin?: number | null | undefined;
    }>>;
    paciente: z.ZodOptional<z.ZodAny>;
    _count: z.ZodOptional<z.ZodObject<{
        sessoes: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sessoes: number;
    }, {
        sessoes: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    pacienteId: string;
    medicoId: string;
    estado: string;
    dataInicio: string;
    id: string;
    criadoEm: string;
    clinicaId: string;
    atualizadoEm: string;
    tipoId: string;
    totalSessoes: number;
    frequenciaSemana: number;
    sessoesRealizadas: number;
    dataFimPrevista: string;
    observacoes?: string | null | undefined;
    descricao?: string | null | undefined;
    agendamentoOrigemId?: string | null | undefined;
    responsavelId?: string | null | undefined;
    dataFimReal?: string | null | undefined;
    tipoTratamento?: {
        ativo: boolean;
        nome: string;
        preco: number;
        id: string;
        clinicaId: string;
        descricao?: string | null | undefined;
        duracaoMin?: number | null | undefined;
    } | undefined;
    paciente?: any;
    _count?: {
        sessoes: number;
    } | undefined;
}, {
    pacienteId: string;
    medicoId: string;
    estado: string;
    dataInicio: string;
    id: string;
    criadoEm: string;
    clinicaId: string;
    atualizadoEm: string;
    tipoId: string;
    totalSessoes: number;
    frequenciaSemana: number;
    dataFimPrevista: string;
    observacoes?: string | null | undefined;
    descricao?: string | null | undefined;
    agendamentoOrigemId?: string | null | undefined;
    responsavelId?: string | null | undefined;
    dataFimReal?: string | null | undefined;
    sessoesRealizadas?: number | undefined;
    tipoTratamento?: {
        ativo: boolean;
        nome: string;
        preco: number;
        id: string;
        clinicaId: string;
        descricao?: string | null | undefined;
        duracaoMin?: number | null | undefined;
    } | undefined;
    paciente?: any;
    _count?: {
        sessoes: number;
    } | undefined;
}>;
export type PlanoTratamentoDTO = z.infer<typeof PlanoTratamentoSchema>;
export declare const CriarTipoExameClinicaSchema: z.ZodObject<{
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    preco: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    ativo: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    preco: number;
    descricao?: string | undefined;
}, {
    nome: string;
    ativo?: boolean | undefined;
    preco?: number | undefined;
    descricao?: string | undefined;
}>;
export type CriarTipoExameClinicaDto = z.infer<typeof CriarTipoExameClinicaSchema>;
export declare const CriarTipoTratamentoSchema: z.ZodObject<{
    nome: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
    duracaoMin: z.ZodOptional<z.ZodNumber>;
    preco: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    ativo: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    ativo: boolean;
    nome: string;
    preco: number;
    descricao?: string | undefined;
    duracaoMin?: number | undefined;
}, {
    nome: string;
    ativo?: boolean | undefined;
    preco?: number | undefined;
    descricao?: string | undefined;
    duracaoMin?: number | undefined;
}>;
export type CriarTipoTratamentoDto = z.infer<typeof CriarTipoTratamentoSchema>;
//# sourceMappingURL=tratamentos.d.ts.map