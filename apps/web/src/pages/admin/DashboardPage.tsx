import React, { useState } from 'react';
import { useDashboardStats, useConsultasPorDia } from '../../hooks/useDashboard';
import { useListaAgendamentos } from '../../hooks/useAgendamentos';
import { useAuthStore } from '../../stores/auth.store';
import { getGreeting } from '@clinicaplus/utils';
import { 
  Card, 
  KpiCard, 
  Table, 
  Avatar, 
  ErrorMessage,
  Select,
  StatusBadge,
  HeroBanner,
  AreaChart
} from '@clinicaplus/ui';
import { 
  Users, 
  Activity, 
  Calendar, 
  FileText, 
  Clock 
} from 'lucide-react';
import { formatTime, getInitials } from '@clinicaplus/utils';
import { EstadoAgendamento, type AgendamentoDTO } from '@clinicaplus/types';
import { Link } from 'react-router-dom';

/**
 * Admin Dashboard View
 * High-level overview of clinic operations.
 */
export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('semana');
  const { utilizador } = useAuthStore();
  
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats(periodo);
  
  // Fetch upcoming appointments (simplified for dashboard)
  // Stabilize date to start of minute to avoid query key instability on every re-render
  const dashboardQuery = React.useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return {
      dataInicio: d.toISOString(),
      estado: EstadoAgendamento.PENDENTE,
      limit: 5,
      page: 1
    };
  }, []);

  const { data: upcoming, isLoading: isLoadingUpcoming } = useListaAgendamentos(dashboardQuery);

  // Real chart data from API
  const { data: chartData = [], isLoading: isLoadingChart } = useConsultasPorDia();

  const columns = [
    {
      header: 'Data',
      accessor: (a: AgendamentoDTO) => (
        <span className="text-sm text-neutral-600 font-medium">
          {new Date(a.dataHora).toLocaleDateString('pt-AO')}
        </span>
      )
    },
    {
      header: 'Hora',
      accessor: (a: AgendamentoDTO) => (
        <div className="flex items-center gap-2 text-neutral-600 font-mono">
          <Clock className="h-3.5 w-3.5 opacity-50 text-primary-500" />
          <span className="text-sm font-bold">{formatTime(a.dataHora)}</span>
        </div>
      )
    },
    {
      header: 'Paciente',
      accessor: (a: AgendamentoDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(a.paciente?.nome || '')} size="sm" />
          <span className="font-semibold text-neutral-900 text-sm truncate max-w-[150px]">{a.paciente?.nome}</span>
        </div>
      )
    },
    {
      header: 'Médico',
      accessor: (a: AgendamentoDTO) => (
        <span className="text-sm text-neutral-600 truncate max-w-[150px]">Dr. {a.medico?.nome}</span>
      )
    },
    {
      header: 'Estado',
      accessor: (a: AgendamentoDTO) => <StatusBadge estado={a.estado} />
    }
  ];

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in pb-10 px-4 sm:px-6">
      <HeroBanner 
        title={`${getGreeting()}, ${utilizador?.nome || 'Administrador'}`}
        subtitle={`Resumo da performance para ${periodo === 'hoje' ? 'hoje' : periodo === 'semana' ? 'esta semana' : 'este mês'}`}
        action={
          <div className="w-40">
            <Select 
              options={[
                { value: 'hoje', label: 'Hoje' },
                { value: 'semana', label: 'Semanal' },
                { value: 'mes', label: 'Mensal' },
              ]}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as "hoje" | "semana" | "mes")}
              className="h-10 bg-neutral-50 border-neutral-100 text-neutral-900 rounded-lg font-bold text-[10px] uppercase tracking-widest"
            />
          </div>
        }
      />

      {statsError ? (
        <ErrorMessage error={statsError} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            label="Pacientes Ativos" 
            value={stats?.totalPacientes || 0} 
            icon={Users}
            loading={isLoadingStats}
            trend={{
              value: stats?.tendencias?.pacientes || 0,
              isPositive: (stats?.tendencias?.pacientes || 0) >= 0
            }}
          />
          <KpiCard 
            label="Consultas Hoje" 
            value={stats?.consultasHoje || 0} 
            icon={Activity}
            loading={isLoadingStats}
            trend={{
              value: stats?.tendencias?.consultas || 0,
              isPositive: (stats?.tendencias?.consultas || 0) >= 0
            }}
          />
          <KpiCard 
            label="Consultas na Semana" 
            value={stats?.consultasSemana || 0} 
            icon={Calendar}
            loading={isLoadingStats}
          />
          <KpiCard 
            label="Receitas Ativas" 
            value={stats?.receitasAtivas || 0} 
            icon={FileText}
            loading={isLoadingStats}
            trend={{
              value: stats?.tendencias?.receitas || 0,
              isPositive: (stats?.tendencias?.receitas || 0) >= 0
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments Table */}
        <Card className="lg:col-span-2 p-0 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary-500" /> Próximos Agendamentos
            </h3>
            <Link to="/admin/agendamentos" className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest">
              Ver Todos
            </Link>
          </div>
          <div className="flex-1">
            <Table 
              columns={columns}
              data={upcoming?.items || []}
              isLoading={isLoadingUpcoming}
              keyExtractor={(a) => a.id}
            />
          </div>
        </Card>

        <AreaChart 
          title="Evolução de Consultas"
          subtitle="Volume de atendimento nos últimos 7 dias"
          data={chartData}
          isLoading={isLoadingChart}
          className="shadow-sm"
        />
      </div>
    </div>
  );
}
