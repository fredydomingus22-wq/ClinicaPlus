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

// ──────────────────────────────────────────────────────────────────
// ODONTOLOGIA
// ──────────────────────────────────────────────────────────────────
const questoesOdontologia: AnamneseQuestao[] = [
  // ── Dados Gerais ───────────────────────────────────────────────
  {
    id: 'motivo_consulta',
    secao: 'Dados Gerais',
    label: 'Motivo da consulta',
    tipo: 'text',
    obrigatoria: true,
  },
  {
    id: 'ultima_consulta_odonto',
    secao: 'Dados Gerais',
    label: 'Data da última consulta dentária',
    tipo: 'date',
  },
  {
    id: 'tratamento_anterior',
    secao: 'Dados Gerais',
    label: 'Já realizou tratamento dentário anteriormente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual/Quando?',
  },

  // ── Saúde Geral ────────────────────────────────────────────────
  {
    id: 'boa_saude',
    secao: 'Saúde Geral',
    label: 'Considera-se em boa saúde geral?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Descreva o problema',
  },
  {
    id: 'medico_recente',
    secao: 'Saúde Geral',
    label: 'Consultou um médico recentemente (últimos 6 meses)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Motivo da consulta',
  },
  {
    id: 'tratamento_medico',
    secao: 'Saúde Geral',
    label: 'Está sob tratamento médico actualmente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual tratamento / doença?',
  },
  {
    id: 'medicamentos',
    secao: 'Saúde Geral',
    label: 'Toma algum medicamento regularmente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Quais medicamentos e dosagens?',
  },
  {
    id: 'alergias_medicamentos',
    secao: 'Saúde Geral',
    label: 'Tem alergia a algum medicamento ou anestésico?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual(is)?',
    obrigatoria: true,
  },
  {
    id: 'hospitalizacao',
    secao: 'Saúde Geral',
    label: 'Foi hospitalizado nos últimos 2 anos?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Motivo e data',
  },
  {
    id: 'cirurgia_anterior',
    secao: 'Saúde Geral',
    label: 'Realizou alguma cirurgia anteriormente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual cirurgia e quando?',
  },

  // ── Histórico Cardiovascular ───────────────────────────────────
  {
    id: 'hipertensao',
    secao: 'Histórico Cardiovascular',
    label: 'Tem pressão arterial alta (hipertensão)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Usa medicação? Qual?',
  },
  {
    id: 'doenca_cardiaca',
    secao: 'Histórico Cardiovascular',
    label: 'Tem ou teve alguma doença cardíaca (arritmia, sopro, angina)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Especifique',
  },
  {
    id: 'marcapasso',
    secao: 'Histórico Cardiovascular',
    label: 'Possui marca-passo ou dispositivo cardíaco implantado?',
    tipo: 'boolean',
  },
  {
    id: 'anticoagulante',
    secao: 'Histórico Cardiovascular',
    label: 'Usa anticoagulante (varfarina, aspirina, heparina)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual e dosagem?',
  },

  // ── Histórico Sistémico ────────────────────────────────────────
  {
    id: 'diabetes',
    secao: 'Histórico Sistémico',
    label: 'Tem diabetes?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Tipo I ou II? Controlada?',
  },
  {
    id: 'doenca_renal',
    secao: 'Histórico Sistémico',
    label: 'Tem doença renal ou hepática?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Especifique',
  },
  {
    id: 'doenca_respiratoria',
    secao: 'Histórico Sistémico',
    label: 'Tem asma, bronquite ou outra doença respiratória?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Especifique e use medicação?',
  },
  {
    id: 'epilepsia',
    secao: 'Histórico Sistémico',
    label: 'Tem epilepsia ou convulsões?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Frequência e medicação',
  },
  {
    id: 'doenca_tireoide',
    secao: 'Histórico Sistémico',
    label: 'Tem problema na tiroide?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Hipotiroidismo / Hipertiroidismo?',
  },
  {
    id: 'hiv_hepatite',
    secao: 'Histórico Sistémico',
    label: 'Tem HIV/SIDA ou Hepatite (B ou C)?',
    tipo: 'boolean',
  },
  {
    id: 'cancer',
    secao: 'Histórico Sistémico',
    label: 'Tem ou teve cancro?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual tipo e tratamento?',
  },
  {
    id: 'osteoporose_bifosfonatos',
    secao: 'Histórico Sistémico',
    label: 'Tem osteoporose ou usa bifosfonatos (Fosamax, Actonel)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual medicamento e há quanto tempo?',
  },

  // ── Hábitos e Factores de Risco ────────────────────────────────
  {
    id: 'tabagismo',
    secao: 'Hábitos e Factores de Risco',
    label: 'É fumador ou foi fumador?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Quantos cigarros/dia e por quanto tempo?',
  },
  {
    id: 'alcool',
    secao: 'Hábitos e Factores de Risco',
    label: 'Consome álcool com frequência?',
    tipo: 'boolean',
  },
  {
    id: 'gravidez',
    secao: 'Hábitos e Factores de Risco',
    label: 'Está grávida ou pensa que pode estar? (aplicável a mulheres)',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Quantas semanas?',
  },
  {
    id: 'amamentacao',
    secao: 'Hábitos e Factores de Risco',
    label: 'Está a amamentar?',
    tipo: 'boolean',
  },

  // ── Queixas Odontológicas ──────────────────────────────────────
  {
    id: 'dor_dentes',
    secao: 'Queixas Odontológicas',
    label: 'Tem dor em algum dente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Localização e tipo de dor',
  },
  {
    id: 'sangramento_gengival',
    secao: 'Queixas Odontológicas',
    label: 'Nota sangramento nas gengivas ao escovar?',
    tipo: 'boolean',
  },
  {
    id: 'sensibilidade',
    secao: 'Queixas Odontológicas',
    label: 'Tem sensibilidade ao frio, calor ou doce?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'A que estímulos?',
  },
  {
    id: 'ranger_dentes',
    secao: 'Queixas Odontológicas',
    label: 'Range ou aperta os dentes (bruxismo)?',
    tipo: 'boolean',
  },
  {
    id: 'dor_atm',
    secao: 'Queixas Odontológicas',
    label: 'Tem dor ou estalos na articulação da mandíbula (ATM)?',
    tipo: 'boolean',
  },
  {
    id: 'mau_halito',
    secao: 'Queixas Odontológicas',
    label: 'Tem halitose (mau hálito) persistente?',
    tipo: 'boolean',
  },
  {
    id: 'protese',
    secao: 'Queixas Odontológicas',
    label: 'Usa ou já usou prótese dentária?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Tipo de prótese',
  },
  {
    id: 'implante',
    secao: 'Queixas Odontológicas',
    label: 'Tem implante(s) dentário(s)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Quantos e quando foram colocados?',
  },
  {
    id: 'ortondontia',
    secao: 'Queixas Odontológicas',
    label: 'Realiza ou realizou tratamento ortodôntico (aparelho)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Tipo e duração',
  },
];

// ──────────────────────────────────────────────────────────────────
// GERAL (base questions for any specialty)
// ──────────────────────────────────────────────────────────────────
const questoesGeral: AnamneseQuestao[] = [
  {
    id: 'motivo_consulta',
    secao: 'Dados Gerais',
    label: 'Motivo da consulta',
    tipo: 'text',
    obrigatoria: true,
  },
  {
    id: 'alergias_medicamentos',
    secao: 'Saúde Geral',
    label: 'Tem alergia a algum medicamento?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual(is)?',
    obrigatoria: true,
  },
  {
    id: 'medicamentos',
    secao: 'Saúde Geral',
    label: 'Toma algum medicamento regularmente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Quais medicamentos e dosagens?',
  },
  {
    id: 'doencas_cronicas',
    secao: 'Saúde Geral',
    label: 'Tem alguma doença crónica?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Quais?',
  },
  {
    id: 'cirurgia_anterior',
    secao: 'Saúde Geral',
    label: 'Realizou alguma cirurgia anteriormente?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual e quando?',
  },
];

// ──────────────────────────────────────────────────────────────────
// CARDIOLOGIA
// ──────────────────────────────────────────────────────────────────
const questoesCardiologia: AnamneseQuestao[] = [
  // Dados Gerais
  {
    id: 'motivo_consulta',
    secao: 'Dados Gerais',
    label: 'Motivo da consulta',
    tipo: 'text',
    obrigatoria: true,
  },
  {
    id: 'sintomas',
    secao: 'Dados Gerais',
    label: 'Sintomas atuais (ex.: dor torácica, falta de ar)',
    tipo: 'text',
    obrigatoria: true,
  },
  // História Cardiovascular
  {
    id: 'hipertensao',
    secao: 'História Cardiovascular',
    label: 'Tem pressão alta (hipertensão)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual medicação?',
  },
  {
    id: 'doenca_cardiaca',
    secao: 'História Cardiovascular',
    label: 'Já foi diagnosticado com doença cardíaca (infarto, arritmia, valvulopatia)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Detalhar doença',
  },
  {
    id: 'marcapasso',
    secao: 'História Cardiovascular',
    label: 'Possui marca-passo ou desfibrilador implantado?',
    tipo: 'boolean',
  },
  {
    id: 'anticoagulante',
    secao: 'História Cardiovascular',
    label: 'Usa anticoagulante (ex.: varfarina, rivaroxabana)?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Qual e dose?',
  },
  // Fatores de Risco
  {
    id: 'tabagismo',
    secao: 'Fatores de Risco',
    label: 'É fumador ou já foi fumador?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Cigarros/dia e tempo',
  },
  {
    id: 'alcool',
    secao: 'Fatores de Risco',
    label: 'Consome álcool com frequência?',
    tipo: 'boolean',
  },
  {
    id: 'diabetes',
    secao: 'Fatores de Risco',
    label: 'Tem diabetes?',
    tipo: 'boolean',
    comObservacao: true,
    labelObservacao: 'Tipo I ou II e controle',
  },
];

// ──────────────────────────────────────────────────────────────────
// PEDIATRIA (pediatric) – official WHO‑style template
// ──────────────────────────────────────────────────────────────────
const questoesPediatria: AnamneseQuestao[] = [
  // Dados Gerais
  { id: 'nome_completo', secao: 'Dados Gerais', label: 'Nome completo', tipo: 'text', obrigatoria: true },
  { id: 'data_nascimento', secao: 'Dados Gerais', label: 'Data de nascimento', tipo: 'date', obrigatoria: true },
  { id: 'sexo', secao: 'Dados Gerais', label: 'Sexo', tipo: 'select', opcoes: [{ valor: 'M', label: 'Masculino' }, { valor: 'F', label: 'Feminino' }], obrigatoria: true },
  { id: 'responsavel', secao: 'Dados Gerais', label: 'Nome do responsável', tipo: 'text' },
  // Histórico de Saúde
  { id: 'vacinas_atualizadas', secao: 'Histórico de Saúde', label: 'Vacinas atualizadas?', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  { id: 'doencas_cronicas', secao: 'Histórico de Saúde', label: 'Doenças crônicas', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  { id: 'alergias', secao: 'Histórico de Saúde', label: 'Alergias', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  { id: 'medicamentos', secao: 'Histórico de Saúde', label: 'Uso de medicamentos regulares', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  // Desenvolvimento
  { id: 'peso_atual', secao: 'Desenvolvimento', label: 'Peso atual (kg)', tipo: 'text' },
  { id: 'altura_atual', secao: 'Desenvolvimento', label: 'Altura atual (cm)', tipo: 'text' },
  { id: 'marco_desenvolvimento', secao: 'Desenvolvimento', label: 'Marcos do desenvolvimento (ex.: engatinhar, andar, falar)', tipo: 'text' },
  // Hábitos e Risco
  { id: 'tabagismo_passivo', secao: 'Hábitos', label: 'Exposição ao fumo passivo', tipo: 'boolean' },
  { id: 'alcool_exposicao', secao: 'Hábitos', label: 'Exposição ao álcool (casa)', tipo: 'boolean' },
  { id: 'atividade_fisica', secao: 'Hábitos', label: 'Frequência de atividade física', tipo: 'text' },
];

// ──────────────────────────────────────────────────────────────────
// GINECOLOGIA – obstetrics‑gynecology template (adult female)
// ──────────────────────────────────────────────────────────────────
const questoesGinecologia: AnamneseQuestao[] = [
  // Dados Gerais
  { id: 'nome_completo', secao: 'Dados Gerais', label: 'Nome completo', tipo: 'text', obrigatoria: true },
  { id: 'data_nascimento', secao: 'Dados Gerais', label: 'Data de nascimento', tipo: 'date', obrigatoria: true },
  { id: 'idade_gestacional', secao: 'Dados Gerais', label: 'Idade gestacional (se aplicável)', tipo: 'text' },
  // História Obstétrica
  { id: 'gravidez_atual', secao: 'História Obstétrica', label: 'Número de gestações', tipo: 'text' },
  { id: 'partos', secao: 'História Obstétrica', label: 'Número de partos', tipo: 'text' },
  { id: 'abortos', secao: 'História Obstétrica', label: 'Abortos espontâneos ou induzidos', tipo: 'text' },
  { id: 'complicacoes_gestacao', secao: 'História Obstétrica', label: 'Complicações na gestação atual', tipo: 'boolean', comObservacao: true, labelObservacao: 'Descreva' },
  // Menstruação e Contracepção
  { id: 'menstruacao_regular', secao: 'Saúde Ginecológica', label: 'Menstruação regular?', tipo: 'boolean', comObservacao: true, labelObservacao: 'Intervalo e duração' },
  { id: 'contraceptivo', secao: 'Saúde Ginecológica', label: 'Método contraceptivo em uso', tipo: 'select', opcoes: [{ valor: 'none', label: 'Nenhum' }, { valor: 'pills', label: 'Pílulas' }, { valor: 'iud', label: 'DIU' }, { valor: 'condom', label: 'Preservativo' }, { valor: 'other', label: 'Outro' }] },
  // Histórico Médico
  { id: 'doencas_cronicas', secao: 'Histórico Médico', label: 'Doenças crônicas', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  { id: 'alergias', secao: 'Histórico Médico', label: 'Alergias', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  { id: 'medicamentos', secao: 'Histórico Médico', label: 'Uso de medicamentos regulares', tipo: 'boolean', comObservacao: true, labelObservacao: 'Quais' },
  // Exames e Vacinas
  { id: 'mamografia', secao: 'Exames', label: 'Mamografia recente?', tipo: 'boolean', comObservacao: true, labelObservacao: 'Data' },
  { id: 'colposcopia', secao: 'Exames', label: 'Colposcopia recente?', tipo: 'boolean', comObservacao: true, labelObservacao: 'Data' },
  { id: 'vacinas_hpv', secao: 'Exames', label: 'Vacina contra HPV completa?', tipo: 'boolean' },
];


// ──────────────────────────────────────────────────────────────────
// REGISTRY
// ──────────────────────────────────────────────────────────────────
export const ANAMNESE_TEMPLATES: Record<Especialidade, AnamneseQuestao[]> = {
  ODONTOLOGIA: questoesOdontologia,
  GERAL: questoesGeral,
  CARDIOLOGIA: questoesCardiologia, // added cardiology template
  PEDIATRIA: questoesPediatria,
  GINECOLOGIA: questoesGinecologia,
};

/** Returns unique section names in order for a given specialty */
export function getSecoesByEspecialidade(especialidade: Especialidade): string[] {
  const questoes = ANAMNESE_TEMPLATES[especialidade] ?? questoesGeral;
  return [...new Set(questoes.map((q) => q.secao))];
}

/** Returns questions for a specific section */
export function getQuestoesBySecao(
  especialidade: Especialidade,
  secao: string,
): AnamneseQuestao[] {
  return (ANAMNESE_TEMPLATES[especialidade] ?? questoesGeral).filter(
    (q) => q.secao === secao,
  );
}
