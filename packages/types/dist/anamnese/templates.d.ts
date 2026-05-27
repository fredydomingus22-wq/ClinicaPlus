/**
 * Anamnesis question templates per clinical specialty.
 *
 * Each template is an ordered list of questions that the UI will render
 * dynamically. The structure allows for boolean (Sim/Não), custom text
 * observations, and multi-value responses (e.g., dates, lists).
 */
export type TipoResposta = 'boolean' | 'text' | 'date' | 'multi_date' | 'select';
export interface OpcaoSelect {
    valor: string;
    label: string;
}
export interface AnamneseQuestao {
    /** Unique identifier used as the key in the `respostas` JSON */
    id: string;
    /** Section/group this question belongs to */
    secao: string;
    /** Label displayed to the physician */
    label: string;
    /** Short description or help text (optional) */
    descricao?: string;
    /** Response type */
    tipo: TipoResposta;
    /** If true, shows an observation text-field when the answer is "Sim" */
    comObservacao?: boolean;
    /** Prompt text for the observation field */
    labelObservacao?: string;
    /** Options for 'select' type */
    opcoes?: OpcaoSelect[];
    /** If true, this is a required question */
    obrigatoria?: boolean;
}
export type Especialidade = 'ODONTOLOGIA' | 'CARDIOLOGIA' | 'PEDIATRIA' | 'GINECOLOGIA' | 'GERAL';
export declare const ANAMNESE_TEMPLATES: Record<Especialidade, AnamneseQuestao[]>;
/** Returns unique section names in order for a given specialty */
export declare function getSecoesByEspecialidade(especialidade: Especialidade): string[];
/** Returns questions for a specific section */
export declare function getQuestoesBySecao(especialidade: Especialidade, secao: string): AnamneseQuestao[];
//# sourceMappingURL=templates.d.ts.map