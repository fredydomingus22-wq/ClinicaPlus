import React, { useState } from 'react';
import { useListaAgendamentos } from '../../hooks/useAgendamentos';
import { useAuthStore } from '../../stores/auth.store';
import { 
  Card, 
  Button, 
  StatusBadge, 
  Avatar, 
  Input, 
  Pagination,
  EmptyState,
  Badge,
  Table
} from '@clinicaplus/ui';
import { Search, Calendar, Eye, FileText, ChevronRight, Download, Filter } from 'lucide-react';
import { formatTime, formatDate, getInitials, exportToCsv, formatShortDate } from '@clinicaplus/utils';
import { useNavigate } from 'react-router-dom';
import { type AgendamentoDTO } from '@clinicaplus/types';
import { AgendamentoDetailModal } from '../../components/appointments/AgendamentoDetailModal';

/**
 * Historico Atendimentos Page.
 * Allows physicians to review all past appointments they have performed.
 */
export default function HistoricoAtendimentosPage() {
  const navigate = useNavigate();
  const utilizador = useAuthStore(s => s.utilizador);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [detailAgendamento, setDetailAgendamento] = useState<AgendamentoDTO | null>(null);

  const { data: agendamentosData, isLoading } = useListaAgendamentos({
    medicoId: utilizador?.medico?.id,
    page,
    limit: 10,
  });

  const agendamentos = agendamentosData?.items ?? [];
  const totalItems = agendamentosData?.total ?? 0;

  const handleExport = () => {
    if (!agendamentos.length) return;
    
    exportToCsv(
      'historico_atendimentos',
      ['Paciente', 'Nº Paciente', 'Data', 'Hora', 'Tipo', 'Estado'],
      agendamentos.map(ag => [
        ag.paciente.nome,
        ag.paciente.numeroPaciente || '---',
        formatShortDate(new Date(ag.dataHora)),
        formatTime(new Date(ag.dataHora)),
        ag.tipo,
        ag.estado
      ])
    );
  };

  const columns = [
    {
      header: 'Paciente',
      accessor: (ag: AgendamentoDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(ag.paciente.nome)} size="sm" />
          <div>
            <p className="font-semibold text-neutral-900">{ag.paciente.nome}</p>
            <p className="text-xs text-neutral-500">{ag.paciente.numeroPaciente || '---'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Data & Hora',
      accessor: (ag: AgendamentoDTO) => (
        <div className="flex items-center gap-2 text-neutral-600">
          <Calendar className="h-3.5 w-3.5 opacity-50 text-primary-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{formatDate(new Date(ag.dataHora))}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">{formatTime(new Date(ag.dataHora))}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: (ag: AgendamentoDTO) => <StatusBadge estado={ag.estado} />
    },
    {
      header: 'Tipo',
      accessor: (ag: AgendamentoDTO) => (
        <Badge variant="neutral" className="font-bold text-[10px] uppercase tracking-wider">{ag.tipo}</Badge>
      )
    },
    {
      header: '',
      className: 'text-right',
      accessor: (ag: AgendamentoDTO) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 hover:bg-neutral-100"
            onClick={() => setDetailAgendamento(ag)}
            title="Ver Detalhes"
          >
            <Eye className="h-4.5 w-4.5 text-neutral-400" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(`/medico/consulta/${ag.id}`)}
            className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            Prontuário <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in pb-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Histórico de Atendimentos</h1>
          <p className="text-neutral-500 text-sm font-medium">Consulte todos os pacientes atendidos e reveja notas clínicas anteriores.</p>
        </div>
        <Button variant="secondary" className="font-bold" onClick={handleExport} disabled={!agendamentos.length}>
          <Download className="h-4 w-4 mr-2" /> Exportar Lista
        </Button>
      </div>

      <Card className="p-0 overflow-hidden shadow-sm">
        {/* Unified Filter Bar from ReceitasPage */}
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input 
              placeholder="Pesquisar por paciente ou data..."
              className="pl-10 h-11 bg-white border-neutral-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" className="text-neutral-500 font-bold hover:bg-white">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </Button>
        </div>

        <Table 
          columns={columns}
          data={agendamentos}
          isLoading={isLoading}
          keyExtractor={(ag) => ag.id}
          className="border-none shadow-none rounded-none"
          emptyContent={
            <EmptyState 
              icon={FileText}
              title="Sem histórico disponível"
              description="Ainda não foram realizados atendimentos ou a pesquisa não devolveu resultados."
              action={{
                label: "Limpar Pesquisa",
                onClick: () => setSearchTerm(''),
                variant: 'secondary'
              }}
            />
          }
        />

        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
           <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
             Sincronizado com Base de Dados • ClinicaPlus
           </p>
           {totalItems > 10 && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-500 font-medium">Página {page} de {Math.ceil(totalItems / 10)}</span>
                <Pagination 
                  currentPage={page}
                  totalItems={totalItems}
                  itemsPerPage={10}
                  onPageChange={setPage}
                />
              </div>
           )}
        </div>
      </Card>

      <AgendamentoDetailModal
        agendamento={detailAgendamento}
        onClose={() => setDetailAgendamento(null)}
      />
    </div>
  );
}
