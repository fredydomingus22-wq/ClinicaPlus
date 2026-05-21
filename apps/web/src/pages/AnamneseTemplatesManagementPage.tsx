import { useMemo, useState } from 'react';
import { Papel } from '@clinicaplus/types';
import { useAuthStore } from '../stores/auth.store';
import { useEspecialidades } from '../hooks/useEspecialidades';
import { useAnamneseTemplateManagement, type TemplateItem } from '../hooks/useAnamneseTemplateManagement';

export default function AnamneseTemplatesManagementPage() {
  const { utilizador } = useAuthStore();
  const isAdmin = utilizador?.papel === Papel.ADMIN;
  const isMedico = utilizador?.papel === Papel.MEDICO;

  const medicoEspecialidadeId = utilizador?.medico?.especialidadeId || '';
  const [selectedEspecialidadeId, setSelectedEspecialidadeId] = useState<string>(medicoEspecialidadeId);
  const activeEspecialidadeId = isMedico ? medicoEspecialidadeId : selectedEspecialidadeId;

  const { data: especialidadesData } = useEspecialidades({ ativo: true, limit: 200 });
  const especialidades = especialidadesData?.items || [];

  const {
    data: templates = [],
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useAnamneseTemplateManagement(activeEspecialidadeId);

  const [titulo, setTitulo] = useState('');
  const [questoesJson, setQuestoesJson] = useState('[]');
  const [editing, setEditing] = useState<TemplateItem | null>(null);

  const selectedEspecialidadeNome = useMemo(
    () => especialidades.find((esp) => esp.id === activeEspecialidadeId)?.nome || 'Sem especialidade',
    [activeEspecialidadeId, especialidades]
  );

  const onCreate = async () => {
    if (!activeEspecialidadeId || !titulo.trim()) return;
    try {
      const questoes = JSON.parse(questoesJson);
      await createTemplate.mutateAsync({ especialidadeId: activeEspecialidadeId, titulo: titulo.trim(), questoes });
      setTitulo('');
      setQuestoesJson('[]');
    } catch {
      // invalid JSON: keep form values and do nothing
    }
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    await updateTemplate.mutateAsync({
      templateId: editing.id,
      titulo: editing.titulo,
      questoes: editing.questoes,
    });
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Templates de Anamnese</h1>
        <p className="text-sm text-neutral-600">
          {isAdmin ? 'Gerencie templates por especialidade.' : 'Visualize e mantenha os templates da sua especialidade.'}
        </p>
      </div>

      {isAdmin && (
        <div className="max-w-lg">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">Especialidade</label>
          <select
            className="w-full rounded border border-neutral-300 px-3 py-2 bg-white"
            value={selectedEspecialidadeId}
            onChange={(e) => setSelectedEspecialidadeId(e.target.value)}
          >
            <option value="">Selecione uma especialidade</option>
            {especialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {isMedico && (
        <div className="rounded border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          Especialidade ativa: <span className="font-semibold">{selectedEspecialidadeNome}</span>
        </div>
      )}

      {!activeEspecialidadeId ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Selecione uma especialidade para continuar.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(templates || []).map((tpl) => (
              <div key={tpl.id} className="rounded border border-neutral-200 bg-white p-4 space-y-3">
                <div>
                  <h2 className="font-semibold text-neutral-900">{tpl.titulo}</h2>
                  <p className="text-xs text-neutral-500">{tpl.questoes?.length || 0} questoes</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded bg-neutral-900 text-white px-3 py-1.5 text-sm"
                    onClick={() => setEditing(tpl)}
                  >
                    Editar
                  </button>
                  {isAdmin && (
                    <button
                      className="rounded bg-red-600 text-white px-3 py-1.5 text-sm"
                      onClick={() => deleteTemplate.mutate(tpl.id)}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isLoading && <p className="text-sm text-neutral-600">Carregando templates...</p>}

          {isAdmin && (
            <div className="rounded border border-neutral-200 bg-white p-4 space-y-3">
              <h3 className="font-semibold text-neutral-900">Novo template</h3>
              <input
                className="w-full rounded border border-neutral-300 px-3 py-2"
                placeholder="Titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <textarea
                className="w-full rounded border border-neutral-300 px-3 py-2 min-h-32 font-mono text-xs"
                placeholder='[{"id":"q1","pergunta":"..."},{"id":"q2","pergunta":"..."}]'
                value={questoesJson}
                onChange={(e) => setQuestoesJson(e.target.value)}
              />
              <button className="rounded bg-emerald-600 text-white px-3 py-1.5 text-sm" onClick={onCreate}>
                Criar template
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded border border-neutral-200 bg-white p-4 space-y-3">
            <h3 className="font-semibold text-neutral-900">Editar template</h3>
            <input
              className="w-full rounded border border-neutral-300 px-3 py-2"
              value={editing.titulo}
              onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
            />
            <textarea
              className="w-full rounded border border-neutral-300 px-3 py-2 min-h-48 font-mono text-xs"
              value={JSON.stringify(editing.questoes || [], null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setEditing({ ...editing, questoes: parsed });
                } catch {
                  // ignore malformed JSON while user types
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button className="rounded border border-neutral-300 px-3 py-1.5 text-sm" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="rounded bg-neutral-900 text-white px-3 py-1.5 text-sm" onClick={onSaveEdit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
