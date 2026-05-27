import React, { useState } from 'react';
import { 
  usePlanosClinica 
} from '../../hooks/useTratamentos';
import { 
  Card, 
  Table, 
  Badge, 
  Button, 
  ErrorMessage,
  Avatar,
  Modal
} from '@clinicaplus/ui';
import { 
  Search, 
  Activity, 
  TrendingUp,
  ExternalLink,
  Calendar,
  Plus
} from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import type { PlanoTratamentoDTO } from '@clinicaplus/types';
import { TratamentoDetalheModal } from '../../components/tratamentos/TratamentoDetalheModal';
import { CriarPlanoForm } from '../../components/tratamentos/CriarPlanoForm';

export default function GestaoTratamentosPage() {
  const [activeTab, setActiveTab] = useState<'ativo' | 'concluido'>('ativo');
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [pacienteFilter, setPacienteFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);

  // Map tab to status filter
  const statusFilter = activeTab === 'ativo' ? 'ACTIVO' : 'CONCLUIDO';

  const { data, isLoading, error, refetch } = usePlanosClinica({
    estado: statusFilter,
    q: searchTerm || undefined
  });

  // Extract arrays recursively considering axios { data: { data: [] } } nested formats
  const extractArray = (obj: unknown): unknown[] => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    const dataObj = obj as { data?: unknown };
    if (dataObj.data) return Array.isArray(dataObj.data) ? dataObj.data : extractArray(dataObj.data);
    return [];
  };

  const planos = extractArray(data) as PlanoTratamentoDTO[];

  const columns = [
    {
      header: 'Tratamento',
      accessor: (p: PlanoTratamentoDTO) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary-50 rounded-lg">
            <Activity className="h-4 w-4 text-secondary-600" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{p.tipoTratamento?.nome || 'Tratamento'}</p>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Início: {formatDate(p.dataInicio)}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Paciente',
      accessor: (p: PlanoTratamentoDTO) => (
        <div className="flex items-center gap-2">
          <Avatar initials={p.paciente?.nome?.[0] || 'P'} size="sm" />
          <div>
            <p className="text-sm font-medium text-neutral-900">{p.paciente?.nome || '---'}</p>
            <p className="text-[10px] text-neutral-500">Total: {p.totalSessoes} Sessões</p>
          </div>
        </div>
      )
    },
    {
      header: 'Progresso',
      accessor: (p: PlanoTratamentoDTO) => {
        const realizadas = p.sessoesRealizadas || 0;
        const total = p.totalSessoes || 1;
        const progress = Math.round((realizadas / total) * 100);
        
        return (
          <div className="w-40">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-bold text-neutral-700">{progress}%</span>
              <span className="text-neutral-500">{realizadas}/{total}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Estado',
      accessor: (p: PlanoTratamentoDTO) => {
        const variants: Record<string, "info" | "success" | "neutral" | "error"> = {
          ACTIVO: 'info',
          CONCLUIDO: 'success',
          PENDENTE: 'neutral',
          CANCELADO: 'error'
        };
        return <Badge variant={variants[p.estado as string] || 'neutral'}>{p.estado}</Badge>;
      }
    },
    {
      header: 'Ações',
      align: 'right' as const,
      accessor: (p: PlanoTratamentoDTO) => (
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlanoId(p.id);
            }}
          >
            Gerir
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/admin/pacientes/${p.pacienteId}/historico`;
            }
          }>
            <ExternalLink className="h-3 w-3 mr-1" /> Prontuário
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestão de Tratamentos</h1>
          <p className="text-neutral-600">Acompanhamento global de planos de reabilitação e terapias</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary-50 rounded-lg text-secondary-700 border border-secondary-100">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-bold">{planos.length} Planos {activeTab === 'ativo' ? 'Ativos' : 'Concluídos'}</span>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Plano
          </Button>
        </div>
      </div>

      <Card className="p-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('ativo')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'ativo' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setActiveTab('concluido')}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'concluido' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Concluídos
          </button>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Pesquisar por paciente ou tratamento..."
              className="w-full h-10 pl-10 pr-4 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-48">
            <select
              className="w-full h-10 px-3 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
            >
              <option value="">Todos os Tipos</option>
              <option value="fisioterapia">Fisioterapia</option>
              <option value="ortodontia">Ortodontia</option>
              <option value="odontologia">Odontologia</option>
            </select>
          </div>
          <div className="w-full lg:w-48">
            <input
              type="date"
              className="w-full h-10 px-3 text-sm border border-neutral-200 rounded-md outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {(searchTerm || tipoFilter || dateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setTipoFilter('');
                setDateFilter('');
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        {error ? (
          <ErrorMessage error={error} />
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <Table
              columns={columns}
              data={planos}
              isLoading={isLoading}
              keyExtractor={(p: PlanoTratamentoDTO) => p.id}
              onRowClick={(p: PlanoTratamentoDTO) => setSelectedPlanoId(p.id)}
            />
          </div>
        )}
      </Card>

      {/* Modal de Detalhes e Gestão de Sessões */}
      {selectedPlanoId && (
        <TratamentoDetalheModal 
          id={selectedPlanoId}
          isOpen={!!selectedPlanoId}
          onClose={() => setSelectedPlanoId(null)}
        />
      )}

      {/* Modal de Criação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Plano de Tratamento"
        size="lg"
      >
        <div className="pt-2">
          <CriarPlanoForm 
            onSuccess={() => {
              setIsModalOpen(false);
              refetch();
            }}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      </Modal>
    </div>
  );
}
