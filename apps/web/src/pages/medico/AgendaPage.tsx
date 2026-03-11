import React, { useState } from 'react';
import { useListaAgendamentos } from '../../hooks/useAgendamentos';
import { useAuthStore } from '../../stores/auth.store';
import { 
  Card, 
  Button, 
  StatusBadge, 
  Avatar, 
  Skeleton, 
  HeroBanner, 
  Tabs,
  Badge,
  EmptyState
} from '@clinicaplus/ui';
import { Clock, Eye, ChevronRight, Calendar } from 'lucide-react';
import { formatTime, getInitials } from '@clinicaplus/utils';
import { useNavigate } from 'react-router-dom';
import { EstadoAgendamento, type AgendamentoDTO } from '@clinicaplus/types';
import { AgendamentoDetailModal } from '../../components/appointments/AgendamentoDetailModal';

/**
 * Medico Agenda Page.
 * Specialized view for the doctor's daily schedule.
 */
export default function AgendaPage() {
  const navigate = useNavigate();
  const utilizador = useAuthStore(s => s.utilizador);
  const [activeTab, setActiveTab] = useState('HOJE_TODOS');
  const [detailAgendamento, setDetailAgendamento] = useState<AgendamentoDTO | null>(null);

  // Get today's dates for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Determine date range based on active tab
  const isProximos = activeTab === 'PROXIMOS';
  const dataInicio = isProximos ? tomorrow.toISOString() : today.toISOString();
  const dataFim = isProximos ? undefined : tomorrow.toISOString();

  const { data: agendamentosData, isLoading } = useListaAgendamentos({
    medicoId: utilizador?.medico?.id,
    dataInicio,
    dataFim,
    page: 1,
    limit: 100,
  });

  const allAgendamentos = agendamentosData?.items ?? [];
  
  const filteredAgendamentos = allAgendamentos.filter(ag => {
    if (activeTab === 'HOJE_TODOS' || activeTab === 'PROXIMOS') return true;
    if (activeTab === 'PENDENTE') return ag.estado === EstadoAgendamento.PENDENTE || ag.estado === EstadoAgendamento.CONFIRMADO;
    if (activeTab === 'EM_ESPERA') return ag.estado === EstadoAgendamento.EM_ESPERA;
    if (activeTab === 'EM_PROGRESSO') return ag.estado === EstadoAgendamento.EM_PROGRESSO;
    if (activeTab === 'CONCLUIDO') return ag.estado === EstadoAgendamento.CONCLUIDO;
    return true;
  });

  const TABS = [
    { id: 'HOJE_TODOS', label: 'Hoje (Tudo)' },
    { id: 'PENDENTE', label: 'Agendados' },
    { id: 'EM_ESPERA', label: 'Em Espera' },
    { id: 'EM_PROGRESSO', label: 'Em Atendimento' },
    { id: 'CONCLUIDO', label: 'Concluídos' },
    { id: 'PROXIMOS', label: 'Próximas Consultas' },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-0 space-y-8 animate-fade-in pb-24 md:pb-12">
      <HeroBanner 
        title="Minha Agenda"
        subtitle={isProximos ? "Consultas agendadas para os próximos dias" : `Atendimentos para hoje, ${today.toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}`}
        action={
          <Badge variant="neutral" className="bg-white/20 border-white/30 text-white font-bold uppercase tracking-widest px-4 py-2">
            {allAgendamentos.length} Marcações {isProximos ? 'Futuras' : 'Hoje'}
          </Badge>
        }
      />

      <div className="w-full">
        <Tabs 
          items={TABS} 
          activeTab={activeTab} 
          onChange={setActiveTab} 
          className="bg-white p-1 rounded-xl border border-neutral-100 shadow-sm w-full"
        />
      </div>

      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="divide-y divide-neutral-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6 flex items-center gap-4">
                <Skeleton variant="circle" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-1/4" />
                  <Skeleton variant="text" className="w-1/6" />
                </div>
              </div>
            ))
          ) : filteredAgendamentos.length === 0 ? (
            <EmptyState 
              icon={Calendar}
              title="Nenhum agendamento encontrado"
              description="Não existem consultas nesta categoria para o período selecionado."
            />
          ) : (
            filteredAgendamentos.map((ag: AgendamentoDTO) => (
              <div key={ag.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-neutral-50/50 transition-all group">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center justify-center min-w-[80px] h-[80px] bg-white rounded-2xl text-primary-700 border border-neutral-100 shadow-sm group-hover:bg-primary-50 group-hover:border-primary-100 transition-all text-center">
                    {isProximos ? (
                      <>
                        <span className="text-xs font-black uppercase opacity-60 leading-none mb-1">{new Date(ag.dataHora).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })}</span>
                        <span className="text-sm font-bold tracking-tight">{formatTime(new Date(ag.dataHora))}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-bold tracking-tight">{formatTime(new Date(ag.dataHora))}</span>
                        <span className="text-[9px] uppercase font-black opacity-40">Horário</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <Avatar initials={getInitials(ag.paciente.nome)} size="lg" className="ring-4 ring-white shadow-md" />
                    <div>
                      <h3 className="font-bold text-neutral-900 text-lg group-hover:text-primary-700 transition-colors uppercase tracking-tight">
                        {ag.paciente.nome}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <StatusBadge estado={ag.estado} />
                        <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {ag.tipo}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="font-bold text-xs gap-2"
                    onClick={() => setDetailAgendamento(ag)}
                  >
                    <Eye className="h-4 w-4" /> Detalhes
                  </Button>
                  
                  {ag.estado === EstadoAgendamento.CONCLUIDO ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate(`/medico/consulta/${ag.id}`)}
                      className="font-bold text-xs text-primary-600 hover:bg-primary-50"
                    >
                      Rever Consulta
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => (isProximos ? setDetailAgendamento(ag) : navigate(`/medico/consulta/${ag.id}`))}
                      disabled={ag.estado === EstadoAgendamento.CANCELADO || ag.estado === EstadoAgendamento.NAO_COMPARECEU}
                      className="shadow-lg shadow-primary-500/20 gap-2 font-bold text-xs px-6"
                    >
                      {ag.estado === EstadoAgendamento.EM_PROGRESSO ? 'Continuar Atendimento' : isProximos ? 'Ver Agendamento' : 'Atender Paciente'} 
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
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
