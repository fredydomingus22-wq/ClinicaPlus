import React, { useState } from 'react';
import { useDashboardMedico } from '../../hooks/useDashboard';
import { useUpdateEstadoAgendamento } from '../../hooks/useAgendamentos';
import { useAuthStore } from '../../stores/auth.store';
import { 
  KpiCard, 
  Card, 
  Button, 
  StatusBadge, 
  Avatar, 
  Skeleton, 
  HeroBanner, 
  EmptyState,
  Badge
} from '@clinicaplus/ui';
import { 
  Stethoscope, 
  CheckCircle, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Activity, 
  FileText, 
  Eye 
} from 'lucide-react';
import { formatTime, getInitials, getGreeting } from '@clinicaplus/utils';
import { useNavigate } from 'react-router-dom';
import { EstadoAgendamento, type AgendamentoDTO } from '@clinicaplus/types';
import { AgendamentoDetailModal } from '../../components/appointments/AgendamentoDetailModal';

/**
 * Physician Dashboard Page.
 * Displays medical stats and today's appointment list.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const utilizador = useAuthStore(s => s.utilizador);
  const { data: stats, isLoading: loadingStats } = useDashboardMedico();
  const updateEstado = useUpdateEstadoAgendamento();
  const [detailAgendamento, setDetailAgendamento] = useState<AgendamentoDTO | null>(null);

  // Appointments are already ordered by hour in the service
  const agendamentos = stats?.agendamentos ?? [];

  const KPIS = [
    { label: 'Consultas Hoje', value: stats?.consultasHoje ?? 0, icon: Calendar, color: 'blue' as const },
    { label: 'A Aguardar', value: stats?.aAguardar ?? 0, icon: Clock, color: 'amber' as const },
    { label: 'Concluídas Total', value: stats?.concluidas ?? 0, icon: CheckCircle, color: 'green' as const },
  ];

  const handleIniciarConsulta = async (id: string) => {
    try {
      await updateEstado.mutateAsync({ id, estado: EstadoAgendamento.EM_PROGRESSO });
      navigate(`/medico/consulta/${id}`);
    } catch {
      navigate(`/medico/consulta/${id}`);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto space-y-8 animate-fade-in pb-12">
      <HeroBanner 
        title={`${getGreeting()}, ${utilizador?.nome || 'Doutor(a)'}`}
        subtitle={`${agendamentos.length} atendimentos marcados para hoje | Africa/Luanda`}
        action={
          <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-100 uppercase tracking-widest">
            <Clock className="h-3 w-3 text-primary-500" /> {new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KPIS.map(kpi => (
          <KpiCard key={kpi.label} {...kpi} loading={loadingStats} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments List */}
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-white">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary-500" /> Agenda de Hoje
              </h2>
              <Badge variant="info" className="uppercase tracking-tight">
                {agendamentos.length} Marcações
              </Badge>
            </div>

            <div className="divide-y divide-neutral-100">
              {loadingStats ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-6 flex items-center gap-4">
                    <Skeleton variant="circle" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-1/4" />
                      <Skeleton variant="text" className="w-1/6" />
                    </div>
                  </div>
                ))
              ) : agendamentos.length === 0 ? (
                <EmptyState 
                  icon={Calendar}
                  title="Sem consultas para hoje"
                  description="Aproveite para atualizar os seus registros clínicos ou descansar."
                />
              ) : (
                agendamentos.map(ag => (
                  <div key={ag.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center min-w-[70px] h-[70px] bg-white rounded-2xl text-primary-700 border border-neutral-100 shadow-sm group-hover:bg-primary-50 group-hover:border-primary-100 group-hover:scale-105 transition-all text-center">
                        <span className="text-sm font-extrabold tracking-tight">{formatTime(new Date(ag.dataHora))}</span>
                        <span className="text-[9px] uppercase font-black opacity-60">Horário</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar initials={getInitials(ag.paciente.nome)} size="md" className="ring-2 ring-white shadow-sm" />
                        <div>
                          <p className="font-bold text-neutral-900 leading-tight group-hover:text-primary-700 transition-colors">{ag.paciente.nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge estado={ag.estado} />
                            <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-tighter">{ag.paciente.numeroPaciente}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Ver Detalhes"
                        onClick={() => setDetailAgendamento(ag as AgendamentoDTO)}
                      >
                        <Eye className="h-4 w-4 text-neutral-400" />
                      </Button>
                      {ag.estado === 'CONCLUIDO' ? (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => navigate(`/medico/consulta/${ag.id}`)}
                          className="font-bold text-xs"
                        >
                          Ver Resumo
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleIniciarConsulta(ag.id)}
                          disabled={ag.estado === 'CANCELADO' || ag.estado === 'NAO_COMPARECEU'}
                          loading={updateEstado.isPending}
                          className="gap-2 font-bold text-xs px-5"
                        >
                          Iniciar Consulta <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Side Column - Info */}
        <div className="space-y-6">
          <Card className="p-8 bg-primary-900 text-white border-0 shadow-xl overflow-hidden relative group">
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                 <Activity className="h-6 w-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-white">Registo Automático</h3>
              <p className="text-white text-sm leading-relaxed mb-8 opacity-90">
                Todas as notas da consulta são guardadas automaticamente. Foque no paciente, a ClinicaPlus trata da burocracia.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black text-teal-400 uppercase tracking-[0.2em]">
                Eficiência Clínica
              </div>
            </div>
            <Stethoscope className="absolute -bottom-10 -right-10 h-40 w-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
          </Card>

          <Card className="p-6">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-4">Acesso Rápido</h3>
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                fullWidth 
                className="justify-start gap-4 hover:bg-primary-50 hover:text-primary-700 transition-all font-bold"
                onClick={() => navigate('/medico/receitas')}
              >
                <FileText className="h-4 w-4 text-primary-500" />
                <span className="text-sm">Histórico de Receitas</span>
              </Button>
              <Button 
                variant="ghost" 
                fullWidth 
                className="justify-start gap-4 hover:bg-primary-50 hover:text-primary-700 transition-all font-bold"
                onClick={() => navigate('/perfil')}
              >
                <Calendar className="h-4 w-4 text-primary-500" />
                <span className="text-sm">Gerir Horário</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <AgendamentoDetailModal
        agendamento={detailAgendamento}
        onClose={() => setDetailAgendamento(null)}
      />
    </div>
  );
}
