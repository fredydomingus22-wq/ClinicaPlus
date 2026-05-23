import React, { useState, useEffect, useCallback } from 'react';
import { useAnamneseTemplate, useAnamneseByAgendamento, useCreateAnamnese, useUpdateAnamnese } from '../../hooks/useAnamnese';
import { SelectionToggle } from '@clinicaplus/ui';
import { Save, ClipboardCheck, Info } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import type { Especialidade, AnamneseQuestao } from '@clinicaplus/types';

interface AnamneseTabProps {
  agendamentoId: string;
  pacienteId: string;
  medicoId: string;
  /** Optional specialty prop – if provided the component will skip the selector */
  especialidade?: string;
  isReadOnly?: boolean;
}

interface RespostaState {
  value: any;
  observation?: string;
}

export const AnamneseTab: React.FC<AnamneseTabProps> = ({
  agendamentoId,
  pacienteId,
  medicoId,
  especialidade,
  isReadOnly = false,
}) => {
  // Helper to normalize string specialties from the database into the typecheck-safe Especialidade enum
  const normalizeEspecialidade = (nome: string | undefined): Especialidade => {
    if (!nome) return 'GERAL';
    const clean = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (clean.includes('GERAL') || clean.includes('CLINICA')) return 'GERAL';
    if (clean.includes('ODONTOLOGIA')) return 'ODONTOLOGIA';
    if (clean.includes('CARDIOLOGIA')) return 'CARDIOLOGIA';
    if (clean.includes('PEDIATRIA')) return 'PEDIATRIA';
    if (clean.includes('GINECOLOGIA')) return 'GINECOLOGIA';
    return 'GERAL';
  };

  // ---------------------------------------------------------------------
  // Specialty selection logic
  // ---------------------------------------------------------------------
  const specialties: Especialidade[] = ['GERAL', 'ODONTOLOGIA', 'CARDIOLOGIA', 'PEDIATRIA', 'GINECOLOGIA'];
  const [selectedEspecialidade, setSelectedEspecialidade] = useState<Especialidade>(
    normalizeEspecialidade(especialidade)
  );

  useEffect(() => {
    if (especialidade) {
      setSelectedEspecialidade(normalizeEspecialidade(especialidade));
    }
  }, [especialidade]);

  const handleEspecialidadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Especialidade;
    setSelectedEspecialidade(value);
  };

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------
  const { data: templateData, isLoading: loadingTemplate } = useAnamneseTemplate(selectedEspecialidade);
  const { data: anamnese, isLoading: loadingAnamnese } = useAnamneseByAgendamento(agendamentoId);

  const [template, setTemplate] = useState<any>(null);
  useEffect(() => {
    if (templateData) setTemplate(templateData);
  }, [templateData]);

  // ---------------------------------------------------------------------
  // Form state handling
  // ---------------------------------------------------------------------
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({});
  const [activeAnamnese, setActiveAnamnese] = useState<any>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const activeAnamneseRef = React.useRef<any>(null);
  const isSavingRef = React.useRef(false);
  const pendingSaveRef = React.useRef(false);
  const respostasRef = React.useRef<Record<string, RespostaState>>({});

  useEffect(() => {
    activeAnamneseRef.current = anamnese;
    setActiveAnamnese(anamnese);
    
    // Apenas inicializa as respostas locais na primeira vez que os dados são carregados,
    // para não sobrescrever edições em curso durante os auto-saves.
    if (!initialLoaded && anamnese !== undefined) {
      if (anamnese?.respostas) {
        setRespostas(anamnese.respostas as Record<string, RespostaState>);
      } else {
        setRespostas({});
      }
      setInitialLoaded(true);
    }
  }, [anamnese, initialLoaded]);

  useEffect(() => {
    respostasRef.current = respostas;
  }, [respostas]);

  const debouncedRespostas = useDebounce(respostas, 1500);

  const createMutation = useCreateAnamnese();
  const updateMutation = useUpdateAnamnese();

  const performSave = useCallback(
    async (currentRespostas: Record<string, RespostaState>) => {
      if (isReadOnly) return;
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      const currentActive = activeAnamneseRef.current;
      const hasChanged = JSON.stringify(currentRespostas) !== JSON.stringify(currentActive?.respostas || {});
      if (!hasChanged) return;

      isSavingRef.current = true;
      try {
        if (!currentActive) {
          const created = await createMutation.mutateAsync({
            agendamentoId,
            pacienteId,
            medicoId,
            especialidade: selectedEspecialidade,
            respostas: currentRespostas,
          });
          activeAnamneseRef.current = created;
          setActiveAnamnese(created);
        } else {
          const updated = await updateMutation.mutateAsync({
            id: currentActive.id,
            payload: { respostas: currentRespostas },
          });
          activeAnamneseRef.current = updated;
          setActiveAnamnese(updated);
        }
      } catch {
        // autosave silencioso; o utilizador pode voltar a editar
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          performSave(respostasRef.current);
        }
      }
    },
    [agendamentoId, pacienteId, medicoId, selectedEspecialidade, isReadOnly, createMutation, updateMutation],
  );

  useEffect(() => {
    if (Object.keys(debouncedRespostas).length > 0) {
      performSave(debouncedRespostas);
    }
  }, [debouncedRespostas, performSave]);

  const handleToggleChange = (questaoId: string, value: any) => {
    if (isReadOnly) return;
    const obs = respostas[questaoId]?.observation;
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: obs !== undefined ? { value, observation: obs } : { value },
    }));
  };

  const handleObservationChange = (questaoId: string, observation: string) => {
    if (isReadOnly) return;
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: { value: prev[questaoId]?.value ?? null, observation },
    }));
  };

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  if (!selectedEspecialidade) {
    return (
      <div className="p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Selecione a especialidade</label>
        <select
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          onChange={handleEspecialidadeChange}
          value=""
        >
          <option value="" disabled>Selecione…</option>
          {specialties.map((esp) => (
            <option key={esp} value={esp}>
              {esp}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (loadingTemplate || loadingAnamnese) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando formulário de anamnese…</p>
      </div>
    );
  }

  if (!template) return null;

  // Group questions by section
  const sections = (template as AnamneseQuestao[]).reduce<Record<string, AnamneseQuestao[]>>((acc, q) => {
    const secao = q.secao;
    if (!acc[secao]) acc[secao] = [];
    acc[secao]!.push(q);
    return acc;
  }, {});

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900 leading-none mb-1">Anamnese de {selectedEspecialidade}</h4>
          <p className="text-xs text-blue-700 opacity-80 leading-relaxed">
            As respostas são guardadas automaticamente enquanto preenche. Utilize os botões para seleção rápida.
          </p>
        </div>
        {isSaving && (
          <div className="ml-auto flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-blue-200">
            <Save className="h-3 w-3 animate-pulse" />
            Sincronizando…
          </div>
        )}
      </div>

      {Object.entries(sections).map(([secao, questoes]) => (
        <section key={secao} className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border-l-4 border-blue-600">
            <ClipboardCheck className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{secao}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questoes.map((q) => {
              const observacaoProps = q.comObservacao
                ? {
                    comObservacao: true as const,
                    ...(q.labelObservacao ? { labelObservacao: q.labelObservacao } : {}),
                    observacao: respostas[q.id]?.observation ?? '',
                    onObservacaoChange: (obs: string) => handleObservationChange(q.id, obs),
                  }
                : {};
              return (
                <SelectionToggle
                  key={q.id}
                  label={q.label}
                  type={q.tipo}
                  value={respostas[q.id]?.value ?? null}
                  onChange={(val: any) => handleToggleChange(q.id, val)}
                  {...observacaoProps}
                  disabled={isReadOnly}
                />
              );
            })}
          </div>
        </section>
      ))}

      {isReadOnly && template.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-400 italic">Nenhuma pergunta configurada para esta especialidade.</p>
        </div>
      )}
    </div>
  );
};
