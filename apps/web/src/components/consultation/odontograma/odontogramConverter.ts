import { DenteStatus, type OdontogramaMarcacao } from '@clinicaplus/types';

/**
 * Mapeamento de status para cores (usado no react-odontogram)
 */
const STATUS_COLORS: Record<DenteStatus, { fill: string; outline: string }> = {
  [DenteStatus.SAUDAVEL]: { fill: '#ffffff', outline: '#94a3b8' },
  [DenteStatus.CARIE]: { fill: '#ef4444', outline: '#b91c1c' },
  [DenteStatus.FRATURA]: { fill: '#f59e0b', outline: '#b45309' },
  [DenteStatus.TRATAMENTO_CANAL]: { fill: '#8b5cf6', outline: '#6d28d9' },
  [DenteStatus.CANAL_TRATADO]: { fill: '#a78bfa', outline: '#7c3aed' },
  [DenteStatus.TRATADO]: { fill: '#60a5fa', outline: '#1d4ed8' },
  [DenteStatus.AUSENTE]: { fill: '#6b7280', outline: '#374151' },
  [DenteStatus.PROTESE]: { fill: '#10b981', outline: '#047857' },
  [DenteStatus.DESTRUICAO]: { fill: '#374151', outline: '#111827' },
};

/**
 * Prioridade de status para determinar o status predominante do dente
 * Ordem: do mais grave para o menos grave
 */
const STATUS_PRIORITY: DenteStatus[] = [
  DenteStatus.DESTRUICAO,
  DenteStatus.AUSENTE,
  DenteStatus.TRATAMENTO_CANAL,
  DenteStatus.CARIE,
  DenteStatus.FRATURA,
  DenteStatus.CANAL_TRATADO,
  DenteStatus.TRATADO,
  DenteStatus.PROTESE,
  DenteStatus.SAUDAVEL,
];

/**
 * Converte marcacoes (por faces) para teethConditions (por dente)
 * Usado para visualização no react-odontogram
 */
export function marcacoesToTeethConditions(
  marcacoes: OdontogramaMarcacao[]
): Array<{ label: string; teeth: string[]; fillColor: string; outlineColor: string }> {
  // Agrupar marcacoes por dente
  const marcacoesPorDente = new Map<number, OdontogramaMarcacao[]>();
  marcacoes.forEach((m) => {
    const existing = marcacoesPorDente.get(m.numeroDente) || [];
    marcacoesPorDente.set(m.numeroDente, [...existing, m]);
  });

  // Para cada dente, determinar o status predominante
  const conditionsByStatus = new Map<DenteStatus, string[]>();

  marcacoesPorDente.forEach((marcacoesDente, numeroDente) => {
    // Se não há marcacoes, dente é saudável
    if (marcacoesDente.length === 0) {
      const teeth = conditionsByStatus.get(DenteStatus.SAUDAVEL) || [];
      conditionsByStatus.set(DenteStatus.SAUDAVEL, [...teeth, `teeth-${numeroDente}`]);
      return;
    }

    // Encontrar o status com maior prioridade
    let statusPredominante = DenteStatus.SAUDAVEL;
    let maxPriority = STATUS_PRIORITY.length;

    marcacoesDente.forEach((m) => {
      const priority = STATUS_PRIORITY.indexOf(m.status);
      if (priority < maxPriority) {
        maxPriority = priority;
        statusPredominante = m.status;
      }
    });

    const teeth = conditionsByStatus.get(statusPredominante) || [];
    conditionsByStatus.set(statusPredominante, [...teeth, `teeth-${numeroDente}`]);
  });

  // Converter para formato do react-odontogram
  const teethConditions: Array<{
    label: string;
    teeth: string[];
    fillColor: string;
    outlineColor: string;
  }> = [];

  conditionsByStatus.forEach((teeth, status) => {
    if (status === DenteStatus.SAUDAVEL) return; // Não mostrar dentes saudáveis
    const colors = STATUS_COLORS[status];
    teethConditions.push({
      label: status,
      teeth,
      fillColor: colors.fill,
      outlineColor: colors.outline,
    });
  });

  return teethConditions;
}

/**
 * Converte teethConditions para marcacoes
 * Nota: Esta é uma conversão parcial pois teethConditions não tem granularidade de faces
 * Preserva marcacoes existentes e apenas adiciona/atualiza status geral
 */
export function teethConditionsToMarcacoes(
  teethConditions: Array<{ label: string; teeth: string[] }>,
  marcacoesExistentes: OdontogramaMarcacao[] = []
): OdontogramaMarcacao[] {
  // Criar mapa de dente -> status geral
  const statusPorDente = new Map<number, DenteStatus>();
  teethConditions.forEach((condition) => {
    const status = condition.label as DenteStatus;
    condition.teeth.forEach((toothId) => {
      const numeroDente = parseInt(toothId.replace('teeth-', ''), 10);
      statusPorDente.set(numeroDente, status);
    });
  });

  // Preservar marcacoes existentes
  const marcacoesPreservadas = marcacoesExistentes.filter((m) => {
    const statusGeral = statusPorDente.get(m.numeroDente);
    // Se o dente não está em teethConditions, preservar todas as marcacoes
    if (statusGeral === undefined) return true;
    // Se o dente está em teethConditions, preservar se a face tem o mesmo status
    return m.status === statusGeral;
  });

  // Adicionar marcacoes para dentes com status geral (apenas face V como default)
  statusPorDente.forEach((status, numeroDente) => {
    const jaTemMarcacao = marcacoesPreservadas.some(
      (m) => m.numeroDente === numeroDente && m.status === status
    );
    if (!jaTemMarcacao) {
      marcacoesPreservadas.push({
        numeroDente,
        face: 'V' as any, // Face vestibular como default
        status,
      });
    }
  });

  return marcacoesPreservadas;
}

/**
 * Converte numeroDente FDI para formato teeth-{id} do react-odontogram
 */
export function fdiToTeethId(numeroDente: number): string {
  return `teeth-${numeroDente}`;
}

/**
 * Converte teeth-{id} para numeroDente FDI
 */
export function teethIdToFdi(teethId: string): number {
  return parseInt(teethId.replace('teeth-', ''), 10);
}
