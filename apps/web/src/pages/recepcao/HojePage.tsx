import React, { useState, useMemo } from 'react';
import { 
  useAgendamentosHoje, 
  useUpdateEstadoAgendamento 
} from '../../hooks/useAgendamentos';
import { useMedicos } from '../../hooks/useMedicos';
import { 
  Button, 
  Card, 
  Badge, 
  StatusBadge, 
  Avatar, 
  Spinner, 
  Select,
  ErrorMessage,
  KpiCard,
  Table
} from '@clinicaplus/ui';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  ClipboardList,
  Eye
} from 'lucide-react';
import { formatTime } from '@clinicaplus/utils';
import { TriagemModal } from './TriagemModal';
import { AgendamentoDetailModal } from '../../components/appointments/AgendamentoDetailModal';
import { AgendamentoDTO, EstadoAgendamento } from '@clinicaplus/types';

export default function HojePage() {
  const [medicoId, setMedicoId] = useState<string>('');
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoDTO | null>(null);
  const [isTriagemOpen, setIsTriagemOpen] = useState(false);
  const [detailAgendamento, setDetailAgendamento] = useState<AgendamentoDTO | null>(null);

  const { data: agendamentos, isLoading, error } = useAgendamentosHoje(medicoId || undefined);
  const { data: medicosData } = useMedicos({ page: 1, limit: 100, ativo: true });
  const updateEstado = useUpdateEstadoAgendamento();

  const medicosOptions = useMemo(() => [
    { value: '', label: 'Todos os Médicos' },
    ...(medicosData?.items?.map(m => ({ value: m.id, label: m.nome })) || [])
  ], [medicosData]);

  const stats = useMemo(() => {
    if (!agendamentos) return { pendentes: 0, confirmados: 0, emProgresso: 0 };
    return {
      pendentes: agendamentos.filter(a => a.estado === 'PENDENTE').length,
      confirmados: agendamentos.filter(a => a.estado === 'CONFIRMADO').length,
      emProgresso: agendamentos.filter(a => a.estado === 'EM_PROGRESSO').length,
    };
  }, [agendamentos]);

  const handleConfirmar = (id: string) => {
    updateEstado.mutate({ id, estado: EstadoAgendamento.CONFIRMADO });
  };

  const handleAbrirTriagem = (agendamento: AgendamentoDTO) => {
    setSelectedAgendamento(agendamento);
    setIsTriagemOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Vista de Hoje</h1>
          <p className="text-neutral-600 text-sm font-medium">Gestão de consultas e triagem para {new Date().toLocaleDateString('pt-AO')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            options={medicosOptions}
            value={medicoId}
            onChange={(e) => setMedicoId(e.target.value)}
            className="min-w-52"
          />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard 
          label="A Aguardar" 
          value={stats.pendentes} 
          icon={Clock} 
          color="amber"
          badgeText="Pendente"
        />
        <KpiCard 
          label="Confirmados" 
          value={stats.confirmados} 
          icon={CheckCircle} 
          color="blue"
          badgeText="Confirmado"
        />
        <KpiCard 
          label="Em Consulta" 
          value={stats.emProgresso} 
          icon={Users} 
          color="slate"
          badgeText="Atendimento"
        />
      </div>

      {/* List */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : error ? (
          <ErrorMessage error={error} />
        ) : agendamentos?.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto h-12 w-12 text-neutral-100" />
            <h3 className="mt-2 text-sm font-semibold text-neutral-900">Nenhum agendamento</h3>
            <p className="mt-1 text-sm text-neutral-600">Não existem consultas marcadas para hoje com os filtros selecionados.</p>
          </div>
        ) : (
          <Table<AgendamentoDTO>
            data={agendamentos || []}
            keyExtractor={(ag) => ag.id}
            columns={[
              {
                header: 'Hora',
                accessor: (ag) => (
                  <span className="font-medium text-neutral-900">
                    {formatTime(ag.dataHora)}
                  </span>
                )
              },
              {
                header: 'Paciente',
                accessor: (ag) => (
                  <div className="flex items-center gap-3 py-1">
                    <Avatar initials={ag.paciente?.nome.split(' ').map(n=>n[0]).join('')} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{ag.paciente?.nome}</p>
                      <p className="text-xs text-neutral-600">ID: {ag.paciente?.numeroPaciente}</p>
                    </div>
                  </div>
                )
              },
              {
                header: 'Médico',
                accessor: (ag) => (
                  <p className="text-sm text-neutral-600">Dr(a). {ag.medico?.nome.split(' ').pop()}</p>
                )
              },
              {
                header: 'Estado',
                accessor: (ag) => <StatusBadge estado={ag.estado} />
              },
              {
                header: 'Acções',
                className: 'text-right',
                accessor: (ag) => (
                  <div className="flex items-center justify-end gap-2">
                    {ag.estado === 'PENDENTE' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleConfirmar(ag.id)}
                        loading={updateEstado.isPending && updateEstado.variables?.id === ag.id}
                        disabled={updateEstado.isPending}
                      >
                        Confirmar
                      </Button>
                    )}
                    {ag.estado === 'CONFIRMADO' && (
                      <Button size="sm" variant="secondary" onClick={() => handleAbrirTriagem(ag)}>
                        <ClipboardList className="h-4 w-4 mr-1" /> Fazer Triagem
                      </Button>
                    )}
                    {ag.estado === 'EM_PROGRESSO' && (
                      <Badge variant="info">Em Consulta</Badge>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver Detalhes" onClick={() => setDetailAgendamento(ag)}>
                      <Eye className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>
                )
              }
            ]}
          />
        )}
      </Card>

      {selectedAgendamento && (
        <TriagemModal 
          isOpen={isTriagemOpen}
          onClose={() => { setIsTriagemOpen(false); setSelectedAgendamento(null); }}
          agendamento={selectedAgendamento}
        />
      )}

      <AgendamentoDetailModal
        agendamento={detailAgendamento}
        onClose={() => setDetailAgendamento(null)}
      />
    </div>
  );
}
