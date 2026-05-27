import { Papel, Plano, EstadoAgendamento, TipoAgendamento } from './enums';
import { MedicoHorario } from './schemas/medico.schema';
import { Triagem } from './schemas/agendamento.schema';
import { Medicamento } from './schemas/receita.schema';
export interface ContactoClinicaDTO {
    id: string;
    clinicaId: string;
    tipo: string;
    valor: string;
    descricao: string | null;
    ordem: number;
    criadoEm: string;
}
export interface ClinicaDTO {
    id: string;
    nome: string;
    slug: string;
    logo: string | null;
    logotipoUrl: string | null;
    telefone: string | null;
    email: string;
    endereco: string | null;
    cidade: string | null;
    provincia: string | null;
    plano: Plano;
    subscricaoEstado: 'TRIAL' | 'ACTIVA' | 'GRACE_PERIOD' | 'SUSPENSA' | 'CANCELADA';
    subscricaoValidaAte: string | null;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
    nif?: string | null;
    tipoEntidade?: 'SINGULAR' | 'EMPRESA' | null;
    razaoSocial?: string | null;
    regimeFiscal?: 'GERAL' | 'SIMPLIFICADO' | 'EXUSA' | null;
    agtSoftwareCert?: string | null;
    enderecoPostal?: string | null;
    serieDocFiscal?: string | null;
    /**
     * NOTA DE SEGURANÇA:
     * Nunca expor segredos (tokens/keys) no payload da API.
     * Estes flags permitem ao UI mostrar "configurado" sem revelar o conteúdo.
     */
    agtPrivateKeyConfigured?: boolean;
    agtPublicKeyConfigured?: boolean;
    configuracao?: {
        id: string;
        lembrete24h: boolean;
        lembrete2h: boolean;
        agendamentoOnline: boolean;
        preTriagem: boolean;
        prontuarioCustom: boolean;
        horasAntecedencia: number;
        moedaSimbolo: string;
        fusoHorario: string;
        seguradoras: string[];
        alvara?: string | null;
    };
    contactos?: ContactoClinicaDTO[];
}
export interface UtilizadorDTO {
    id: string;
    clinicaId: string | null;
    nome: string;
    email: string;
    avatarUrl: string | null;
    papel: Papel;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
    paciente?: PacienteDTO;
    medico?: MedicoDTO;
}
export interface AuthResponse {
    accessToken: string;
    utilizador: UtilizadorDTO;
}
export interface PacienteDTO {
    id: string;
    clinicaId: string;
    numeroPaciente: string;
    utilizadorId: string | null;
    nome: string;
    avatarUrl: string | null;
    dataNascimento: string;
    genero: string;
    tipoSangue: string | null;
    alergias: string[];
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    provincia: string | null;
    nif: string | null;
    seguroSaude: boolean;
    seguradora: string | null;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
}
export interface EspecialidadeDTO {
    id: string;
    clinicaId: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
}
export interface MedicoDTO {
    id: string;
    clinicaId: string;
    utilizadorId: string;
    nome: string;
    especialidadeId: string;
    especialidade?: EspecialidadeDTO;
    ordem: string | null;
    telefoneDireto: string | null;
    horario: MedicoHorario;
    duracaoConsulta: number;
    preco: number;
    ativo: boolean;
    criadoEm: string;
    atualizadoEm: string;
}
export interface AgendamentoDTO {
    id: string;
    clinicaId: string;
    pacienteId: string;
    paciente: PacienteDTO;
    medicoId: string;
    medico: MedicoDTO;
    dataHora: string;
    duracao: number;
    tipo: TipoAgendamento;
    estado: EstadoAgendamento;
    motivoConsulta: string | null;
    observacoes: string | null;
    triagem: Triagem | null;
    notasConsulta: string | null;
    diagnostico: string | null;
    canceladoPor: string | null;
    canceladoEm: string | null;
    criadoEm: string;
    atualizadoEm: string;
    canal?: string | null;
    confirmadoWa?: boolean;
    receita?: ReceitaDTO;
    prontuario?: ProntuarioDTO;
    exames?: ExameDTO[];
    documentos?: DocumentoDTO[];
}
export interface ProntuarioDTO {
    id: string;
    clinicaId: string;
    pacienteId: string;
    medicoId: string;
    agendamentoId: string | null;
    notas: string;
    diagnostico: string | null;
    criadoEm: string;
    atualizadoEm: string;
}
export interface ExameDTO {
    id: string;
    clinicaId: string;
    pacienteId: string;
    medicoId: string;
    agendamentoId: string | null;
    nome: string;
    tipo: string;
    status: string;
    estado: string;
    resultado: string | null;
    laudoUrl?: string;
    descricao?: string;
    dataPedido: string;
    dataResultado: string | null;
    criadoEm: string;
    atualizadoEm: string;
    tipoCatalogo?: {
        id: string;
        nome: string;
    };
}
export interface DocumentoDTO {
    id: string;
    clinicaId: string;
    pacienteId: string;
    medicoId: string | null;
    agendamentoId: string | null;
    tipo: string;
    nome: string;
    url: string;
    criadoEm: string;
}
export interface ReceitaDTO {
    id: string;
    clinicaId: string;
    agendamentoId: string;
    pacienteId: string;
    medicoId: string;
    diagnostico: string;
    medicamentos: Medicamento[];
    observacoes: string | null;
    dataEmissao: string;
    dataValidade: string;
    criadoEm: string;
    atualizadoEm: string;
    paciente?: PacienteDTO;
    medico?: MedicoDTO;
}
export interface DashboardStats {
    totalPacientes: number;
    consultasHoje: number;
    consultasSemana: number;
    receitasAtivas: number;
    faturamentoEstimado: number;
    taxaOcupacao: number;
    novosPacientes: number;
    distribuicaoEspecialidade: {
        label: string;
        value: number;
    }[];
    aAguardar?: number;
    tendencias: {
        pacientes: number;
        consultas: number;
        receitas: number;
        faturamento: number;
        ocupacao: number;
        novosPacientes: number;
    };
}
export type DashboardStatsDTO = DashboardStats;
export interface MedicoDashboardDTO {
    consultasHoje: number;
    concluidas: number;
    aAguardar: number;
    agendamentos: AgendamentoDTO[];
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}
export type PaginatedResponse<T> = PaginatedResult<T>;
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code: string;
    };
}
export interface NotificacaoDTO {
    id: string;
    utilizadorId: string;
    titulo: string;
    mensagem: string;
    tipo: 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO' | 'AGENDAMENTO' | 'RECEITA';
    lida: boolean;
    url?: string;
    criadoEm: string;
}
export interface SystemLogDTO {
    id: string;
    nivel: string;
    mensagem: string;
    acao: string | null;
    detalhes: any;
    criadoEm: string;
    utilizadorNome: string;
    utilizadorEmail: string;
}
export interface GlobalSettingsDTO {
    id: string;
    modoManutencao: boolean;
    registoNovasClinicas: boolean;
    maxUploadSizeMb: number;
    mensagemSistema: string | null;
    atualizadoEm: string;
}
export interface WaAutomacaoDTO {
    id: string;
    clinicaId: string;
    waInstanciaId: string;
    tipo: string;
    ativo: boolean;
    configuracao: any;
    n8nWorkflowId: string | null;
    n8nWebhookUrl: string | null;
    criadoEm: string;
    atualizadoEm: string;
}
export type ClinicaMessageType = 'TEXT' | 'INTERACTIVE_REPLY' | 'UNKNOWN';
export interface ClinicaMessageDTO {
    clinicaId: string;
    instanciaId: string;
    channel: 'META_CLOUD' | 'BAILEYS';
    telefone: string;
    nomeContato: string;
    messageType: ClinicaMessageType;
    value: string;
    messageId: string;
    timestamp: string;
}
//# sourceMappingURL=dtos.d.ts.map