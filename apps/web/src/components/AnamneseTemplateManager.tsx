import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAnamneseTemplates } from '@/hooks/useAnamneseTemplates';
import { AnamneseTemplate, AnamneseQuestao } from '@/types/anamnese';

/**
 * Component visualizando e gerenciando templates de anamnese.
 * - Médicos veem apenas os templates da sua especialidade.
 * - Administradores podem criar/editar/remover templates de qualquer especialidade.
 * Utiliza design "glassmorphism" com Tailwind CSS para visual premium.
 */
export function AnamneseTemplateManager({ especialidadeId }: { especialidadeId: string }) {
  const { user } = useAuth();
  const isAdmin = user?.papel === 'ADMIN';

  const {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useAnamneseTemplates(especialidadeId);

  const [editing, setEditing] = useState<AnamneseTemplate | null>(null);
  const [newTitulo, setNewTitulo] = useState('');
  const [newQuestoes, setNewQuestoes] = useState<AnamneseQuestao[]>([]);

  const handleCreate = async () => {
    if (!newTitulo) return;
    await createTemplate.mutateAsync({ titulo: newTitulo, questoes: newQuestoes });
    setNewTitulo('');
    setNewQuestoes([]);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await updateTemplate.mutateAsync({
      templateId: editing.id,
      titulo: editing.titulo,
      questoes: editing.questoes,
    });
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id);
  };

  if (isLoading) return <div className="text-center py-8">Carregando templates...</div>;
  if (error) return <div className="text-red-500">Erro ao carregar templates.</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800">Templates de Anamnese</h1>

      {/* List */}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((tpl) => (
          <li
            key={tpl.id}
            className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-4 hover:shadow-2xl transition-shadow"
          >
            <h2 className="text-lg font-semibold text-gray-700">{tpl.titulo}</h2>
            <p className="text-sm text-gray-500 mb-2">{tpl.questoes.length} questões</p>
            {isAdmin && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditing(tpl)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Excluir
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Admin creation form */}
      {isAdmin && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg shadow-inner">
          <h2 className="text-xl font-medium mb-3">Criar novo template</h2>
          <input
            type="text"
            placeholder="Título"
            value={newTitulo}
            onChange={(e) => setNewTitulo(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          {/* Simplified questões input – could be expanded to modal */}
          <textarea
            placeholder="JSON das questões"
            value={JSON.stringify(newQuestoes, null, 2)}
            onChange={(e) => {
              try {
                setNewQuestoes(JSON.parse(e.target.value));
              } catch { /* ignore invalid json */ }
            }}
            className="w-full p-2 border rounded mb-2 h-32"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Criar
          </button>
        </div>
      )}

      {/* Edit modal (simple) */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Editar Template</h3>
            <input
              type="text"
              value={editing.titulo}
              onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
              className="w-full p-2 border rounded mb-2"
            />
            <textarea
              value={JSON.stringify(editing.questoes, null, 2)}
              onChange={(e) => {
                try {
                  const q = JSON.parse(e.target.value);
                  setEditing({ ...editing, questoes: q });
                } catch { /* ignore */ }
              }}
              className="w-full p-2 border rounded mb-2 h-32"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1 text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
