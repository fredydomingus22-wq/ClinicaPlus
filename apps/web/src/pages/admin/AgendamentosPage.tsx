import React, { useState } from 'react';
import { useListaAgendamentos, useUpdateEstadoAgendamento, agendamentosKeys } from '../../hooks/useAgendamentos';
import { agendamentosApi } from '../../api/agendamentos';
import { useDebounce } from '../../hooks/useDebounce';
import { useMedicos } from '../../hooks/useMedicos';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Select,
  StatusBadge, 
  Avatar, 
  ErrorMessage,
  Badge
} from '@clinicaplus/ui';
import { 
  Search, 
  Download, 
  Filter, 
  Calendar, 
  X,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { 
  formatShortDate, 
  formatTime, 
  getInitials, 
  exportToCsv 
} from '@clinicaplus/utils';
import { EstadoAgendamento, TipoAgendamento, AgendamentoDTO } from '@clinicaplus/types';
import { AgendamentoDetailModal } from '../../components/appointments/AgendamentoDetailModal';

/**
 * Admin Appointments Page
 * Full access to view, filter, cancel and export all clinic appointments.
 */
export default function AgendamentosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({
    medicoId: '',
    estado: '' as EstadoAgendamento | '',
    tipo: '' as TipoAgendamento | '',
    dataInicio: '',
    dataFim: ''
  });
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoDTO | null>(null);

  const { data, isLoading, error } = useListaAgendamentos({ 
    page, 
    limit: 15,
    medicoId: filtros.medicoId || undefined,
    estado: (filtros.estado as EstadoAgendamento) || undefined,
    tipo: (filtros.tipo as TipoAgendamento) || undefined,
    dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio).toISOString() : undefined,
    dataFim: filtros.dataFim ? new Date(filtros.dataFim).toISOString() : undefined
  });

  const queryClient = useQueryClient();

  // Local filtering for search term since backend doesn't support text search
  const filteredItems = React.useMemo(() => {
    if (!data?.items) return [];
    if (!debouncedSearch) return data.items;
    
    const term = debouncedSearch.toLowerCase();
    return data.items.filter(a => 
      a.paciente.nome.toLowerCase().includes(term) ||
      a.paciente.numeroPaciente?.toLowerCase().includes(term) ||
      a.medico.nome.toLowerCase().includes(term)
    );
  }, [data?.items, debouncedSearch]);

  const { data: medicosData } = useMedicos({ page: 1, limit: 100 });
  const { mutate: updateEstado, isPending: isUpdating } = useUpdateEstadoAgendamento();

  const handleExportCSV = () => {
    if (!data?.items || data.items.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    exportToCsv(
      'clinica_agendamentos',
      ['Data', 'Hora', 'Paciente', 'Nº Paciente', 'Médico', 'Especialidade', 'Tipo', 'Estado'],
      data.items.map(ag => [
        formatShortDate(new Date(ag.dataHora)),
        formatTime(new Date(ag.dataHora)),
        ag.paciente.nome,
        ag.paciente.numeroPaciente,
        ag.medico.nome,
        ag.medico.especialidade?.nome || 'N/A',
        ag.tipo,
        ag.estado
      ])
    );
  };

  const handleUpdateEstado = (id: string, novoEstado: EstadoAgendamento) => {
    let motivo;
    if (novoEstado === EstadoAgendamento.CANCELADO) {
      motivo = window.prompt('Motivo do cancelamento:');
      if (!motivo) return; // Requere motivo para cancelar
    } else {
      const confirm = window.confirm(`Tem a certeza que deseja alterar o estado para ${novoEstado}?`);
      if (!confirm) return;
    }

    updateEstado({ 
      id, 
      estado: novoEstado, 
      ...(motivo ? { motivo } : {}) 
    });
  };

  const limparFiltros = () => {
    setFiltros({
      medicoId: '',
      estado: '',
      tipo: '',
      dataInicio: '',
      dataFim: ''
    });
    setSearchTerm('');
    setPage(1);
  };

  const medicosOptions = [
    { value: '', label: 'Todos os Médicos' },
    ...(medicosData?.items?.map(m => ({ value: m.id, label: `Dr. ${m.nome} (${m.especialidade})` })) || [])
  ];

  const estadosOptions = [
    { value: '', label: 'Todos os Estados' },
    { value: EstadoAgendamento.PENDENTE, label: 'Pendente' },
    { value: EstadoAgendamento.CONFIRMADO, label: 'Confirmado' },
    { value: EstadoAgendamento.EM_PROGRESSO, label: 'Em Progresso' },
    { value: EstadoAgendamento.CONCLUIDO, label: 'Concluído' },
    { value: EstadoAgendamento.CANCELADO, label: 'Cancelado' },
    { value: EstadoAgendamento.NAO_COMPARECEU, label: 'Faltou' },
  ];

  const tiposOptions = [
    { value: '', label: 'Todos os Tipos' },
    { value: TipoAgendamento.CONSULTA, label: 'Consulta' },
    { value: TipoAgendamento.RETORNO, label: 'Retorno' },
    { value: TipoAgendamento.EXAME, label: 'Exame' },
  ];

  const columns = [
    {
      header: 'Data / Hora',
      accessor: (a: AgendamentoDTO) => (
        <div>
          <p className="font-semibold text-neutral-900">{formatShortDate(new Date(a.dataHora))}</p>
          <p className="text-xs text-neutral-500 font-mono">{formatTime(new Date(a.dataHora))}</p>
        </div>
      )
    },
    {
      header: 'Paciente',
      accessor: (a: AgendamentoDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(a.paciente?.nome || 'P')} size="sm" />
          <div className="max-w-[160px]">
            <p className="font-semibold text-neutral-900 truncate" title={a.paciente?.nome}>{a.paciente?.nome}</p>
            <p className="text-[10px] text-neutral-500">{a.paciente?.numeroPaciente}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Médico',
      accessor: (a: AgendamentoDTO) => (
        <div className="max-w-[140px]">
          <p className="text-sm font-medium text-neutral-800 truncate" title={a.medico?.nome}>Dr. {a.medico?.nome.split(' ').pop()}</p>
          <p className="text-[10px] text-neutral-500 truncate" title={a.medico?.especialidade?.nome}>{a.medico?.especialidade?.nome}</p>
        </div>
      )
    },
    {
      header: 'Tipo',
      accessor: (a: AgendamentoDTO) => (
         <Badge variant={a.tipo === 'RETORNO' ? 'info' : 'neutral'} className="text-[10px]">
           {a.tipo}
         </Badge>
      )
    },
    {
      header: 'Estado',
      accessor: (a: AgendamentoDTO) => <StatusBadge estado={a.estado} />
    },
    {
      header: 'Acções',
      align: 'right' as const,
      accessor: (a: AgendamentoDTO) => (
        <div className="flex items-center justify-end gap-2">
          {/* Quick actions based on strict business rules */}
          {a.estado === EstadoAgendamento.PENDENTE && (
            <Button 
              size="sm" 
              variant="secondary"
              disabled={isUpdating}
              className="h-8 text-[11px] font-bold text-success-600 border-success-200 hover:bg-success-50"
              onClick={() => handleUpdateEstado(a.id, EstadoAgendamento.CONFIRMADO)}
            >
              <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
            </Button>
          )}

          {![EstadoAgendamento.CONCLUIDO, EstadoAgendamento.CANCELADO, EstadoAgendamento.NAO_COMPARECEU].includes(a.estado) && (
            <Button 
              size="sm" 
              variant="ghost" 
              disabled={isUpdating}
              className="h-8 w-8 p-0 text-danger-500 hover:bg-danger-50 rounded-full"
              title="Cancelar Agendamento"
              onClick={() => handleUpdateEstado(a.id, EstadoAgendamento.CANCELADO)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}

          <Button 
            variant="secondary" 
            size="sm" 
            className="h-8 w-8 p-0"
            title="Ver Detalhes"
            onClick={() => setSelectedAgendamento(a)}
          >
            <Eye className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in pb-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Gestão Global de Agendamentos</h1>
          <p className="text-neutral-500 text-sm font-medium">Controlo administrativo de todas as marcações da clínica.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="secondary" 
             className="rounded-xl font-bold border-neutral-200"
             onClick={handleExportCSV}
             disabled={isLoading || !filteredItems.length}
           >
             <Download className="h-4 w-4 mr-2" /> Exportar CSV
           </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-neutral-100 shadow-sm relative z-0">
        {/* Filtros */}
        <div className="p-4 border-b border-neutral-100 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input 
              placeholder="Pesquisar paciente..."
              className="pl-9 h-10 bg-neutral-50 border-neutral-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select 
            options={medicosOptions}
            value={filtros.medicoId}
            onChange={(e) => setFiltros(f => ({ ...f, medicoId: e.target.value }))}
            className="h-10 bg-neutral-50 border-neutral-200"
          />

          <Select 
            options={estadosOptions}
            value={filtros.estado}
            onChange={(e) => setFiltros(f => ({ ...f, estado: e.target.value as EstadoAgendamento | '' }))}
            className="h-10 bg-neutral-50 border-neutral-200"
          />

          <Select 
             options={tiposOptions}
             value={filtros.tipo}
             onChange={(e) => setFiltros(f => ({ ...f, tipo: e.target.value as TipoAgendamento | '' }))}
             className="h-10 bg-neutral-50 border-neutral-200"
          />

          <div className="flex items-center gap-2">
             <Button variant="ghost" onClick={limparFiltros} className="h-10 w-full text-neutral-500 hover:text-neutral-900">
               <X className="h-4 w-4 mr-2" /> Limpar
             </Button>
          </div>
        </div>
        
        {/* Data Range Extension */}
        <div className="px-4 pb-4 border-b border-neutral-100 bg-white flex items-center gap-4">
           <div className="flex items-center gap-2 text-sm text-neutral-600">
             <Calendar className="h-4 w-4" /> Período:
           </div>
           <div className="flex items-center gap-2">
             <Input 
               type="date" 
               className="h-9 w-40 text-sm bg-neutral-50 border-neutral-200"
               value={filtros.dataInicio}
               onChange={(e) => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
             />
             <span className="text-neutral-400">até</span>
             <Input 
               type="date" 
               className="h-9 w-40 text-sm bg-neutral-50 border-neutral-200"
               value={filtros.dataFim}
               onChange={(e) => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
             />
           </div>
        </div>

        {error ? (
          <div className="p-8">
            <ErrorMessage error={error} />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={filteredItems}
            isLoading={isLoading}
            keyExtractor={(a) => a.id}
            onRowHover={(a) => {
              queryClient.prefetchQuery({
                queryKey: agendamentosKeys.one(a.id),
                queryFn: () => agendamentosApi.getOne(a.id),
                staleTime: 30_000,
              });
            }}
          />
        )}

        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
           <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1">
             <Filter className="h-3 w-3" /> Resultados Filtrados: {filteredItems.length}
           </p>
           <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200 shadow-sm mr-2">
                Página {page} de {Math.ceil((data?.total || 0) / 15) || 1}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={page >= (Math.ceil((data?.total || 0) / 15) || 1)} 
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </Button>
           </div>
        </div>
      </Card>

      <AgendamentoDetailModal
        agendamento={selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
      />
    </div>
  );
}
