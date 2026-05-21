// prisma/seed/anamneseTemplates.ts
import { prisma } from '../src/client';

/**
 * Inserts default Anamnese templates for Pediatrics and Gynecology.
 * The question sets are based on widely used medical intake form structures
 * (see sources from web searches). Each template includes a list of
 * AnamneseTemplateQuestao records that map to the question text and the
 * response type (boolean, text, date, select, etc.).
 */
export async function seedAnamneseTemplates() {
  // Assume a placeholder clinic exists; replace with real clinicaId if needed.
  const clinic = await prisma.clinica.findFirst();
  const clinicaId = clinic?.id ?? 1;

  // Helper to create a template with its questions.
  async function createTemplate(especialidade: string, descricao: string, questoes: { texto: string; tipo: string; options?: string[] }[]) {
    const template = await prisma.anamneseTemplate.create({
      data: {
        clinicaId,
        especialidade,
        descricao,
        questoes: {
          create: questoes.map((q) => ({
            texto: q.texto,
            tipoResposta: q.tipo,
            opcoes: q.options ? q.options.join(',') : undefined,
          })),
        },
      },
    });
    return template;
  }

  // ---- Pediatrics Template ----
  const pediatriaQuestoes = [
    { texto: 'Nome completo da criança', tipo: 'text' },
    { texto: 'Data de nascimento', tipo: 'date' },
    { texto: 'Sexo', tipo: 'select', options: ['Masculino', 'Feminino', 'Outro'] },
    { texto: 'Nome(s) dos responsável(is)', tipo: 'text' },
    { texto: 'Motivo da consulta / queixa principal', tipo: 'text' },
    { texto: 'Histórico de gravidez e parto (se aplicável)', tipo: 'text' },
    { texto: 'Doenças prévias e internações', tipo: 'text' },
    { texto: 'Condições crônicas (asthma, alergias, diabetes, etc.)', tipo: 'text' },
    { texto: 'Vacinas em dia?', tipo: 'boolean' },
    { texto: 'Desenvolvimento (marcos motores, fala, toilet training)', tipo: 'text' },
    { texto: 'Alimentação e sono', tipo: 'text' },
    { texto: 'Histórico familiar de doenças relevantes', tipo: 'text' },
    { texto: 'Observações adicionais dos pais', tipo: 'text' },
  ];
  await createTemplate('PEDIATRIA', 'Modelo de anamnese pediátrica padrão', pediatriaQuestoes);

  // ---- Gynecology Template ----
  const ginecologiaQuestoes = [
    { texto: 'Nome completo', tipo: 'text' },
    { texto: 'Data de nascimento', tipo: 'date' },
    { texto: 'Contato', tipo: 'text' },
    { texto: 'Motivo da visita', tipo: 'text' },
    { texto: 'Histórico menstrual (menarca, ciclo, fluxo, dor)', tipo: 'text' },
    { texto: 'Histórico de exames (Papanicolau, mamografia)', tipo: 'text' },
    { texto: 'Uso de contraceptivo', tipo: 'text' },
    { texto: 'Atividade sexual e ISTs anteriores', tipo: 'text' },
    { texto: 'Histórico obstétrico (gravidezes, abortos, partos)', tipo: 'text' },
    { texto: 'Condições médicas crônicas (hipertensão, diabetes, etc.)', tipo: 'text' },
    { texto: 'Cirurgias ginecológicas prévias', tipo: 'text' },
    { texto: 'Medicamentos atuais e alergias', tipo: 'text' },
    { texto: 'Histórico familiar (câncer de mama/ovário, trombofilia)', tipo: 'text' },
    { texto: 'Uso de álcool, fumo ou drogas', tipo: 'text' },
    { texto: 'Revisão de sistemas (dor pélvica, sangramento, etc.)', tipo: 'text' },
    { texto: 'Observações adicionais', tipo: 'text' },
  ];
  await createTemplate('GINECOLOGIA', 'Modelo de anamnese ginecológica padrão', ginecologiaQuestoes);
}
