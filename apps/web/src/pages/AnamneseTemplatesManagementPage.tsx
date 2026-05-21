import { useMemo, useState } from 'react';
import { Papel } from '@clinicaplus/types';
import { Badge, Button, Card, Input, Modal, Select } from '@clinicaplus/ui';
import { AlertTriangle, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useEspecialidades } from '../hooks/useEspecialidades';
import { useAnamneseTemplateManagement, type TemplateItem } from '../hooks/useAnamneseTemplateManagement';

type PerguntaForm = {
  id?: string;
  pergunta: string;
  tipoResposta: 'text' | 'boolean' | 'date' | 'select';
  optionsText: string;
};

export default function AnamneseTemplatesManagementPage() {
  const { utilizador } = useAuthStore();
  const isAdmin = utilizador?.papel === Papel.ADMIN;
  const isMedico = utilizador?.papel === Papel.MEDICO;

  const medicoEspecialidadeId = utilizador?.medico?.especialidadeId || '';
  const [selectedEspecialidadeId, setSelectedEspecialidadeId] = useState<string>(medicoEspecialidadeId);
  const activeEspecialidadeId = isMedico ? medicoEspecialidadeId : selectedEspecialidadeId;

  const { data: especialidadesData, isLoading: loadingEspecialidades, error: especialidadesError } = useEspecialidades({ limit: 100 });
  const especialidades = especialidadesData?.items || [];

  const { data: templates = [], isLoading, createTemplate, updateTemplate, deleteTemplate } =
    useAnamneseTemplateManagement(activeEspecialidadeId);

  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [formQuestoes, setFormQuestoes] = useState<PerguntaForm[]>([]);
  const [formError, setFormError] = useState('');

  const selectedEspecialidadeNome = useMemo(
    () => especialidades.find((esp) => esp.id === activeEspecialidadeId)?.nome || 'Sem especialidade',
    [activeEspecialidadeId, especialidades],
  );

  function openCreate() {
    setEditing({ id: '', especialidadeId: activeEspecialidadeId, titulo: '', questoes: [] });
    setFormQuestoes([{ pergunta: '', tipoResposta: 'text', optionsText: '' }]);
    setFormError('');
  }

  function openEdit(tpl: TemplateItem) {
    setEditing(tpl);
    setFormError('');
    setFormQuestoes(
      (tpl.questoes || []).map((q: any) => ({
        id: q.id,
        pergunta: q.pergunta || '',
        tipoResposta: (q.tipoResposta || 'text') as PerguntaForm['tipoResposta'],
        optionsText: Array.isArray(q.options)
          ? q.options.map((o: any) => o?.label || o?.valor || '').filter(Boolean).join(', ')
          : '',
      })),
    );
  }

  async function onCreate() {
    if (!activeEspecialidadeId || !editing || !editing.titulo.trim()) return;
    const questoesPayload = buildQuestoesPayload(formQuestoes);
    if (!questoesPayload) return setFormError('Preencha pelo menos uma pergunta válida.');

    await createTemplate.mutateAsync({
      especialidadeId: activeEspecialidadeId,
      titulo: editing.titulo.trim(),
      questoes: questoesPayload as unknown as TemplateItem['questoes'],
    });
    setEditing(null);
    setFormQuestoes([]);
    setFormError('');
  }

  async function onSaveEdit() {
    if (!editing) return;
    const questoesPayload = buildQuestoesPayload(formQuestoes);
    if (!questoesPayload) return setFormError('Preencha pelo menos uma pergunta válida.');

    await updateTemplate.mutateAsync({
      templateId: editing.id,
      titulo: editing.titulo,
      questoes: questoesPayload as unknown as TemplateItem['questoes'],
    });
    setEditing(null);
    setFormQuestoes([]);
    setFormError('');
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Templates de Anamnese</h1>
          <p className="text-sm text-neutral-500 font-medium">
            {isAdmin ? 'Gerencie templates por especialidade.' : 'Visualize e mantenha os templates da sua especialidade.'}
          </p>
        </div>
        {activeEspecialidadeId && isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo Template
          </Button>
        )}
      </div>

      <Card className="p-4 border-neutral-200/60 shadow-sm">
        {isAdmin ? (
          <>
            <Select
              label="Especialidade"
              value={selectedEspecialidadeId}
              onChange={(e) => setSelectedEspecialidadeId(e.target.value)}
              options={especialidades.map((esp) => ({ value: esp.id, label: esp.nome }))}
              placeholder={
                loadingEspecialidades
                  ? 'Carregando especialidades...'
                  : especialidades.length === 0
                    ? 'Nenhuma especialidade encontrada'
                    : 'Selecione uma especialidade'
              }
            />
            {especialidadesError && <p className="mt-2 text-xs text-danger-600">Falha ao carregar especialidades.</p>}
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <span className="font-semibold">Especialidade ativa:</span>
            <Badge variant="neutral">{selectedEspecialidadeNome}</Badge>
          </div>
        )}
      </Card>

      {!activeEspecialidadeId ? (
        <Card className="p-8 text-center border-neutral-200/60 shadow-sm">
          <p className="text-sm text-neutral-600">Selecione uma especialidade para continuar.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
          <div className="border-b border-neutral-100 bg-neutral-50/50 p-4">
            <p className="text-xs font-medium text-neutral-600">{templates.length} template(s) configurado(s)</p>
          </div>
          <div className="p-4 grid gap-4 md:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="p-4 border-neutral-200/80">
                <div>
                  <h2 className="font-semibold text-neutral-900 truncate">{tpl.titulo}</h2>
                  <p className="text-xs text-neutral-500">{tpl.questoes?.length || 0} questões</p>
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)} className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-neutral-500 hover:text-danger-600 hover:bg-danger-50"
                      onClick={() => deleteTemplate.mutate(tpl.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          {isLoading && <div className="p-4 text-sm text-neutral-500">Carregando templates...</div>}
        </Card>
      )}

      {editing && (
        <Modal
          isOpen={!!editing}
          onClose={() => {
            setEditing(null);
            setFormQuestoes([]);
            setFormError('');
          }}
          title={editing.id ? 'Editar Template de Anamnese' : 'Novo Template de Anamnese'}
          size="lg"
        >
          <div className="space-y-4">
            {formError && (
              <div className="p-3 rounded-md bg-danger-50 border border-danger-100 flex gap-2 text-sm text-danger-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {formError}
              </div>
            )}
            <Input
              label="Titulo"
              value={editing.titulo}
              onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
              placeholder="Ex: Anamnese inicial cardiologia"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] font-mono text-neutral-700">Perguntas</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormQuestoes((prev) => [...prev, { pergunta: '', tipoResposta: 'text', optionsText: '' }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar pergunta
                </Button>
              </div>

              {formQuestoes.map((q, idx) => (
                <Card key={idx} className="p-3 border-neutral-200/80">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6">
                      <Input
                        label={`Pergunta ${idx + 1}`}
                        value={q.pergunta}
                        onChange={(e) =>
                          setFormQuestoes((prev) => prev.map((item, i) => (i === idx ? { ...item, pergunta: e.target.value } : item)))
                        }
                        placeholder="Ex: Tem alergia a medicamentos?"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Select
                        label="Tipo de resposta"
                        value={q.tipoResposta}
                        onChange={(e) =>
                          setFormQuestoes((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, tipoResposta: e.target.value as PerguntaForm['tipoResposta'] } : item)),
                          )
                        }
                        options={[
                          { value: 'text', label: 'Texto' },
                          { value: 'boolean', label: 'Sim/Não' },
                          { value: 'date', label: 'Data' },
                          { value: 'select', label: 'Seleção' },
                        ]}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Opções"
                        value={q.optionsText}
                        onChange={(e) =>
                          setFormQuestoes((prev) => prev.map((item, i) => (i === idx ? { ...item, optionsText: e.target.value } : item)))
                        }
                        placeholder="A, B, C"
                        disabled={q.tipoResposta !== 'select'}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-neutral-500 hover:text-danger-600 hover:bg-danger-50"
                        onClick={() => setFormQuestoes((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => (editing.id ? onSaveEdit() : onCreate())}
                loading={createTemplate.isPending || updateTemplate.isPending}
                disabled={!editing.titulo.trim()}
              >
                <FileText className="h-4 w-4 mr-2" />
                {editing.id ? 'Guardar' : 'Criar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function buildQuestoesPayload(questoes: PerguntaForm[]) {
  const cleaned = questoes
    .map((q, index) => {
      const pergunta = q.pergunta.trim();
      if (!pergunta) return null;

      const options =
        q.tipoResposta === 'select'
          ? q.optionsText
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
              .map((label, i) => ({ valor: `op_${i + 1}`, label }))
          : undefined;

      return {
        id: q.id,
        ordem: index + 1,
        pergunta,
        tipoResposta: q.tipoResposta,
        options: options && options.length > 0 ? options : undefined,
      };
    })
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : null;
}
