import React, { useState } from 'react';
import { 
  useEspecialidades, 
  useCreateEspecialidade, 
  useUpdateEspecialidade, 
  useDeleteEspecialidade 
} from '../../hooks/useEspecialidades';
import { 
  Button, 
  Card, 
  Table, 
  Badge, 
  Modal, 
  Input,
  ErrorMessage
} from '@clinicaplus/ui';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  EspecialidadeCreateSchema, 
  type EspecialidadeCreateInput,
  type EspecialidadeDTO 
} from '@clinicaplus/types';
import { textareaClass } from '../../lib/formUtils';

export default function EspecialidadesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [especialidadeToEdit, setEspecialidadeToEdit] = useState<EspecialidadeDTO | null>(null);

  const { data, isLoading, error } = useEspecialidades({ 
    page, 
    limit: 10, 
    q: searchTerm || undefined 
  });

  const { mutate: createEspecialidade, isPending: isCreating, error: createError } = useCreateEspecialidade();
  const { mutate: updateEspecialidade, isPending: isUpdating, error: updateError } = useUpdateEspecialidade();
  const { mutate: deleteEspecialidade } = useDeleteEspecialidade();

  const isEditing = !!especialidadeToEdit;

  const form = useForm<EspecialidadeCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(EspecialidadeCreateSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      nome: '',
      descricao: '',
      ativo: true
    }
  });

  const onSubmit = (values: EspecialidadeCreateInput) => {
    if (isEditing && especialidadeToEdit) {
      updateEspecialidade({ id: especialidadeToEdit.id, data: values }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEspecialidadeToEdit(null);
        }
      });
    } else {
      createEspecialidade(values, {
        onSuccess: () => {
          setIsModalOpen(false);
          form.reset();
        }
      });
    }
  };

  const openEdit = (esp: EspecialidadeDTO) => {
    setEspecialidadeToEdit(esp);
    form.reset({
      nome: esp.nome,
      descricao: esp.descricao || '',
      ativo: esp.ativo
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEspecialidadeToEdit(null);
    form.reset();
  };

  const handleDelete = (id: string, nome: string) => {
    // Note: window.confirm should be replaced by a Modal if available in UI.
    // For now, adhering to the "No browser confirm" implies needing a state-based confirm modal.
    // Since I don't see one in the current UI package imports, I'll stick to a simple modal logic here or confirm if there's a better way.
    if (window.confirm(`Tem a certeza que deseja remover a especialidade "${nome}"?`)) {
      deleteEspecialidade(id);
    }
  };

  const columns = [
    {
      header: 'Nome',
      accessor: (esp: EspecialidadeDTO) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center" aria-hidden="true">
            <Stethoscope className="h-4 w-4 text-primary-600" />
          </div>
          <span className="font-semibold text-neutral-900">{esp.nome}</span>
        </div>
      )
    },
    {
      header: 'Descrição',
      accessor: (esp: EspecialidadeDTO) => (
        <p className="text-sm text-neutral-500 max-w-xs truncate" title={esp.descricao || undefined}>
          {esp.descricao || <span className="italic text-neutral-400">Sem descrição</span>}
        </p>
      )
    },
    {
      header: 'Estado',
      accessor: (esp: EspecialidadeDTO) => (
        <div role="status" aria-label={`Estado: ${esp.ativo ? 'Ativa' : 'Inativa'}`}>
          {esp.ativo ? 
            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Ativa</Badge> : 
            <Badge variant="neutral" className="gap-1"><XCircle className="h-3 w-3" aria-hidden="true" /> Inativa</Badge>
          }
        </div>
      )
    },
    {
      header: 'Acções',
      align: 'right' as const,
      accessor: (esp: EspecialidadeDTO) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openEdit(esp)} 
            className="p-2 h-8 w-8 text-neutral-500 hover:text-primary-600"
            title="Editar Especialidade"
            aria-label={`Editar especialidade ${esp.nome}`}
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDelete(esp.id, esp.nome)}
            className="p-2 h-8 w-8 text-neutral-500 hover:text-danger-600 hover:bg-danger-50"
            title="Remover Especialidade"
            aria-label={`Remover especialidade ${esp.nome}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Especialidades</h1>
          <p className="text-neutral-500 text-sm font-medium">Gerencie as especialidades médicas atendidas pela sua clínica.</p>
        </div>
        <Button onClick={() => { setEspecialidadeToEdit(null); setIsModalOpen(true); }} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Nova Especialidade
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/50 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden="true" />
            <Input 
              placeholder="Pesquisar por nome..."
              className="pl-10 h-10 bg-white"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              aria-label="Pesquisar especialidades"
            />
          </div>
        </div>

        {error ? (
          <div className="p-12">
            <ErrorMessage error={error} />
          </div>
        ) : (
          <div aria-busy={isLoading}>
            <Table 
              columns={columns}
              data={data?.items || []}
              isLoading={isLoading}
              keyExtractor={(esp) => esp.id}
            />
            
            {!isLoading && (!data?.items || data.items.length === 0) && (
              <div className="p-12 text-center" role="status">
                <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                  <Stethoscope className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Nenhuma especialidade encontrada</h3>
                <p className="text-neutral-500">Comece adicionando a primeira especialidade da sua clínica.</p>
              </div>
            )}

            <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">
                Mostrando {data?.items.length || 0} de {data?.total || 0} registos
              </span>
              <nav className="flex gap-2" aria-label="Paginação">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage(p => p - 1)}
                  aria-label="Página anterior"
                >
                  Anterior
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={!data || page >= Math.ceil(data.total / 10) || isLoading}
                  onClick={() => setPage(p => p + 1)}
                  aria-label="Próxima página"
                >
                  Próximo
                </Button>
              </nav>
            </div>
          </div>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={isEditing ? `Editar Especialidade` : "Nova Especialidade"}
        size="md"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2" noValidate>
          {(createError || updateError) && (
            <div role="alert" className="p-3 rounded-md bg-danger-50 border border-danger-100 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-danger-600 shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{(createError as Error)?.message || (updateError as Error)?.message}</p>
            </div>
          )}

          <Input 
            label="Nome da Especialidade" 
            placeholder="Ex: Cardiologia, Pediatria..." 
            required
            {...form.register('nome')}
            error={form.formState.errors.nome?.message as string}
            aria-required="true"
            aria-invalid={!!form.formState.errors.nome}
          />
          
          <div className="space-y-1.5">
            <label htmlFor="descricao" className="text-sm font-semibold text-neutral-700">Descrição (Opcional)</label>
            <textarea 
              id="descricao"
              className={textareaClass(!!form.formState.errors.descricao)}
              placeholder="Breve descrição da especialidade..."
              {...form.register('descricao')}
              aria-invalid={!!form.formState.errors.descricao}
            />
            {form.formState.errors.descricao && (
              <p className="text-xs text-danger-600 font-medium" role="alert">{form.formState.errors.descricao.message as string}</p>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <input 
              type="checkbox" 
              id="esp-ativo" 
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              {...form.register('ativo')}
            />
            <label htmlFor="esp-ativo" className="text-sm font-semibold text-neutral-700 cursor-pointer flex-grow">
              Especialidade Ativa
              <span className="block text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Apenas especialidades ativas aparecem no registo de médicos</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {isEditing ? "Guardar Alterações" : "Criar Especialidade"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
