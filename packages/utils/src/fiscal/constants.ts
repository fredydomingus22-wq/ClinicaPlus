/**
 * Tabela de Isenções de IVA - AGT (DS.120 Anexos)
 * Mapeamento de códigos de isenção para as menções legais obrigatórias no documento.
 */
export const AGT_VAT_EXEMPTIONS: Record<string, { description: string; mention: string }> = {
  'M10': {
    mention: 'Isento nos termos da alínea a) do nº1 do artigo 12.º do CIVA',
    description: 'A transmissão dos bens alimentares, conforme anexo I do presente código.'
  },
  'M11': {
    mention: 'Isento nos termos da alínea b) do nº1 do artigo 12.º do CIVA',
    description: 'As transmissões de medicamentos destinados exclusivamente a fins terapêuticos e profilácticos.'
  },
  'M12': {
    mention: 'Isento nos termos da alínea c) do nº1 do artigo 12.º do CIVA',
    description: 'As transmissões de cadeiras de rodas e veículos semelhantes, accionados manualmente ou por motor, para portadores de deficiência...'
  },
  'M13': {
    mention: 'Isento nos termos da alínea d) do nº1 do artigo 12.º do CIVA',
    description: 'A transmissão de livros, incluindo em formato digital'
  },
  'M14': {
    mention: 'Isento nos termos da alínea e) do nº1 do artigo 12.º do CIVA',
    description: 'A locação de bens imóveis destinados a fins habitacionais...'
  },
  'M15': {
    mention: 'Isento nos termos da alínea f) do nº1 do artigo 12.º do CIVA',
    description: 'As operações sujeitas ao imposto de SISA, ainda que dele isentas'
  },
  'M16': {
    mention: 'Isento nos termos da alínea g) do nº1 do artigo 12.º do CIVA',
    description: 'A exploração e a prática de jogos de fortuna ou azar...'
  },
  'M17': {
    mention: 'Isento nos termos da alínea h) do nº1 do artigo 12.º do CIVA',
    description: 'O transporte colectivo de passageiros'
  },
  'M18': {
    mention: 'Isento nos termos da alínea i) do nº1 artigo 12.º do CIVA',
    description: 'As operações de intermediação financeira, incluindo a locação financeira...'
  },
  'M19': {
    mention: 'Isento nos termos da alínea j) do nº1 do artigo 12.º do CIVA',
    description: 'O seguro de saúde, bem como a prestação de seguros e resseguros do ramo vida'
  },
  'M20': {
    mention: 'Isento nos termos da alínea k) do nº1 do artigo 12.º do CIVA',
    description: 'As transmissões de produtos petrolíferos conforme anexo II do presente código.'
  },
  'M21': {
    mention: 'Isento nos termos da alínea l) do nº1 do artigo 12.º do CIVA',
    description: 'As prestações de serviço que tenham por objecto o ensino...'
  },
  'M22': {
    mention: 'Isento nos termos da alínea m) do artigo 12.º do CIVA',
    description: 'As prestações de serviço médico sanitário, efectuadas por estabelecimentos hospitalares, clínicas, dispensários e similares'
  },
  'M23': {
    mention: 'Isento nos termos da alínea n) do artigo 12.º do CIVA',
    description: 'O transporte de doentes ou feridos em ambulâncias ou outros veículos apropriados...'
  },
  'M24': {
    mention: 'Isento nos termos da alínea o) do artigo 12.º do CIVA',
    description: 'Os equipamentos médicos para o exercício da actividade dos estabelecimentos de saúde.'
  },
  'M80': {
    mention: 'Isento nos termos da alinea a) do nº1 do artigo 14.º',
    description: 'As importações definitivas de bens cuja transmissão no território nacional seja isenta de imposto'
  },
  'M00': {
    mention: 'IVA – Regime Simplificado',
    description: 'IVA – Regime Simplificado'
  },
  'M02': {
    mention: 'Transmissão de bens e serviço não sujeita',
    description: 'Transmissão de bens e serviço não sujeita'
  },
  'M04': {
    mention: 'IVA – Regime de Exclusão',
    description: 'IVA – Regime de Exclusão'
  }
};
