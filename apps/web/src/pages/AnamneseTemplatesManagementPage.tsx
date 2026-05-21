import { useMemo, useState } from 'react';
import { Papel } from '@clinicaplus/types';
import { Badge, Button, Card, Input, Modal, Select, Textarea } from '@clinicaplus/ui';
import { AlertTriangle, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
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

  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [jsonError, setJsonError] = useState<string>('');

  const selectedEspecialidadeNome = useMemo(
    () => especialidades.find((esp) => esp.id === activeEspecialidadeId)?.nome || 'Sem especialidade',
    [activeEspecialidadeId, especialidades]
  );

  const onCreate = async () => {
    if (!activeEspecialidadeId || !editing || !editing.titulo.trim()) return;
    try {
      await createTemplate.mutateAsync({
        especialidadeId: activeEspecialidadeId,
        titulo: editing.titulo.trim(),
        questoes: editing.questoes || [],
      });
      setEditing(null);
      setJsonError('');
    } catch {
      setJsonError('JSON inválido nas questões.');
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
    setJsonError('');
  };

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
          <Button onClick={() => setEditing({ id: '', especialidadeId: activeEspecialidadeId, titulo: '', questoes: [] })}>
            <Plus className="h-4 w-4 mr-2" /> Novo Template
          </Button>
        )}
      </div>

      <Card className="p-4 border-neutral-200/60 shadow-sm">
        {isAdmin ? (
          <Select
            label="Especialidade"
            value={selectedEspecialidadeId}
            onChange={(e) => setSelectedEspecialidadeId(e.target.value)}
            options={especialidades.map((esp) => ({ value: esp.id, label: esp.nome }))}
            placeholder="Selecione uma especialidade"
          />
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
            <p className="text-xs font-medium text-neutral-600">
              {templates.length} template(s) configurado(s)
            </p>
          </div>
          <div className="p-4 grid gap-4 md:grid-cols-2">
            {(templates || []).map((tpl) => (
              <Card key={tpl.id} className="p-4 border-neutral-200/80">
                <div>
                  <h2 className="font-semibold text-neutral-900 truncate">{tpl.titulo}</h2>
                  <p className="text-xs text-neutral-500">{tpl.questoes?.length || 0} questões</p>
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(tpl)} className="h-8 w-8 p-0">
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
            setJsonError('');
          }}
          title={editing.id ? 'Editar Template de Anamnese' : 'Novo Template de Anamnese'}
          size="lg"
        >
          <div className="space-y-4">
            {jsonError && (
              <div className="p-3 rounded-md bg-danger-50 border border-danger-100 flex gap-2 text-sm text-danger-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {jsonError}
              </div>
            )}
            <Input
              label="Titulo"
              value={editing.titulo}
              onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
              placeholder="Ex: Anamnese inicial cardiologia"
            />
            <Textarea
              label="Questoes (JSON)"
              className="min-h-56 font-mono text-xs"
              value={JSON.stringify(editing.questoes || [], null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setEditing({ ...editing, questoes: parsed });
                  setJsonError('');
                } catch {
                  setJsonError('JSON inválido nas questões.');
                }
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button
                onClick={() => (editing.id ? onSaveEdit() : onCreate())}
                loading={createTemplate.isPending || updateTemplate.isPending}
                disabled={!editing.titulo.trim() || !!jsonError}
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
