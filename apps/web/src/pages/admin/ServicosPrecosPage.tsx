import React, { useState } from 'react';
import { 
  useTiposExameClinica, 
  useTiposTratamentoClinica, 
  useCriarTipoExame, 
  useCriarTipoTratamento,
  useDeleteTipoExame,
  useDeleteTipoTratamento
} from '../../hooks/useTratamentos';
import { 
  Table, 
  Badge, 
  Button, 
  Input, 
  Modal,
  Textarea
} from '@clinicaplus/ui';
import { 
  Plus, 
  FileText, 
  Activity, 
  Trash2
} from 'lucide-react';
import { formatKwanza } from '@clinicaplus/utils';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

interface ServicoItem {
  id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  duracaoMin?: number | null;
  ativo: boolean;
}

interface FormValues {
  nome: string;
  descricao: string;
  preco: number;
  duracaoMin?: number;
}

export default function ServicosPrecosPage() {
  const [activeTab, setActiveTab] = useState<'exames' | 'tratamentos'>('exames');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, nome: string } | null>(null);
  
  const { data: exames, isLoading: loadingExames } = useTiposExameClinica();
  const { data: tratamentos, isLoading: loadingTrats } = useTiposTratamentoClinica();
  
  const { mutate: criarExame, isPending: criandoExame } = useCriarTipoExame();
  const { mutate: criarTratamento, isPending: criandoTrat } = useCriarTipoTratamento();
  
  const { mutate: deleteExame, isPending: deletingExame } = useDeleteTipoExame();
  const { mutate: deleteTrat, isPending: deletingTrat } = useDeleteTipoTratamento();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nome: '',
      descricao: '',
      preco: 0,
      duracaoMin: 30
    }
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      preco: Number(values.preco),
      duracaoMin: values.duracaoMin ? Number(values.duracaoMin) : undefined,
      ativo: true
    };

    if (activeTab === 'exames') {
      criarExame(payload, { 
        onSuccess: () => { 
          toast.success('Tipo de exame guardado com sucesso!');
          setIsModalOpen(false); 
          reset(); 
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          toast.error(err?.response?.data?.error?.message || 'Erro ao guardar exame.');
        }
      });
    } else {
      criarTratamento(payload, {
        onSuccess: () => {
          toast.success('Tipo de procedimento guardado com sucesso!');
          setIsModalOpen(false);
          reset();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          toast.error(err?.response?.data?.error?.message || 'Erro ao guardar procedimento.');
        }
      });
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    if (activeTab === 'exames') {
      deleteExame(itemToDelete.id, {
        onSuccess: () => {
          toast.success('Serviço removido com sucesso!');
          setItemToDelete(null);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Erro ao remover serviço.')
      });
    } else {
      deleteTrat(itemToDelete.id, {
        onSuccess: () => {
          toast.success('Serviço removido com sucesso!');
          setItemToDelete(null);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => toast.error(err?.response?.data?.error?.message || 'Erro ao remover serviço.')
      });
    }
  };

  const columns = [
    {
      header: 'Nome do Serviço',
      accessor: (row: ServicoItem) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-50 rounded-lg">
            {activeTab === 'exames' ? <FileText className="w-4 h-4 text-primary-600" /> : <Activity className="w-4 h-4 text-secondary-600" />}
          </div>
          <div>
            <p className="font-bold text-neutral-900">{row.nome}</p>
            <p className="text-xs text-neutral-500 max-w-[300px] truncate">{row.descricao || 'Sem descrição'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Preço (AOA)',
      accessor: (row: ServicoItem) => <span className="font-mono font-bold text-neutral-900">{formatKwanza(row.preco)}</span>
    },
    {
      header: 'Duração',
      accessor: (row: ServicoItem) => row.duracaoMin ? `${row.duracaoMin} min` : 'N/A',
      hidden: activeTab === 'exames'
    },
    {
      header: 'Estado',
      accessor: (row: ServicoItem) => <Badge variant={row.ativo ? 'success' : 'neutral'}>{row.ativo ? 'Activo' : 'Inativo'}</Badge>
    },
    {
      header: 'Ações',
      align: 'right' as const,
      accessor: (row: ServicoItem) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-danger-500 hover:bg-danger-50"
          onClick={() => setItemToDelete({ id: row.id, nome: row.nome })}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('exames')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'exames' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Exames
          </button>
          <button
            onClick={() => setActiveTab('tratamentos')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'tratamentos' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Procedimentos
          </button>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="shadow-sm font-bold" size="sm">
          <Plus className="w-4 h-4 mr-2" /> Novo {activeTab === 'exames' ? 'Exame' : 'Procedimentos'}
        </Button>
      </div>



      <div className="overflow-x-auto -mx-4 px-4 bg-white">
        <Table
          columns={columns.filter(c => !c.hidden)}
          data={((activeTab === 'exames' ? exames : tratamentos) as ServicoItem[]) || []}
          isLoading={activeTab === 'exames' ? loadingExames : loadingTrats}
          keyExtractor={(r: ServicoItem) => r.id}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Adicionar Novo ${activeTab === 'exames' ? 'Tipo de Exame' : 'Tipo de Procedimentos'}`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <Input 
            label="Nome do Serviço" 
            placeholder="Ex: Hemograma Completo" 
            {...register('nome', { required: 'Nome é obrigatório' })}
            error={errors.nome?.message}
          />
          <Textarea 
            label="Descrição / Observações" 
            placeholder="Descreva brevemente o serviço..." 
            {...register('descricao')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Preço (Subtotal AOA)" 
              type="number"
              placeholder="0"
              {...register('preco', { required: 'Preço é obrigatório' })}
              error={errors.preco?.message}
            />
            {activeTab === 'tratamentos' && (
              <Input 
                label="Duração Média (Min)" 
                type="number"
                placeholder="30"
                {...register('duracaoMin')}
              />
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" fullWidth loading={criandoExame || criandoTrat}>Guardar Serviço</Button>
          </div>
        </form>
      </Modal>
      <Modal 
        isOpen={!!itemToDelete} 
        onClose={() => setItemToDelete(null)}
        title="Remover Serviço"
      >
        <div className="space-y-4 pt-4">
          <p className="text-neutral-600">
            Tem certeza que pretende remover o serviço <span className="font-bold">{itemToDelete?.nome}</span>? 
            Esta ação não apagará o histórico já registado com este serviço, mas ele deixará de estar disponível para novos registos.
          </p>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" fullWidth onClick={() => setItemToDelete(null)}>Cancelar</Button>
            <Button 
              onClick={handleDelete}
              fullWidth 
              variant="danger" 
              loading={deletingExame || deletingTrat}
            >
              Remover
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
