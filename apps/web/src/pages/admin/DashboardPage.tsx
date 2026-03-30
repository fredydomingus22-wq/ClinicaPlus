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
  Calendar, 
  FileText, 
  Clock,
  Wallet,
  Percent,
  PieChart,
  UserPlus,
  TrendingUp
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
            label="Novos Pacientes" 
            value={stats?.novosPacientes || 0} 
            icon={UserPlus}
            loading={isLoadingStats}
            trend={{
              value: stats?.tendencias?.novosPacientes || 0,
              isPositive: (stats?.tendencias?.novosPacientes || 0) >= 0
            }}
          />
          <KpiCard 
            label="Consultas na Semana" 
            value={stats?.consultasSemana || 0} 
            icon={Calendar}
            loading={isLoadingStats}
            trend={{
              value: stats?.tendencias?.consultas || 0,
              isPositive: (stats?.tendencias?.consultas || 0) >= 0
            }}
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
          <KpiCard 
            label="Faturamento Est." 
            value={`${(stats?.faturamentoEstimado || 0).toLocaleString('pt-AO')} Kz`}
            icon={Wallet}
            loading={isLoadingStats}
            trend={{
              value: stats?.tendencias?.faturamento || 0,
              isPositive: (stats?.tendencias?.faturamento || 0) >= 0
            }}
          />
        </div>
      )}

      {/* Row 2: Evolução (2/3) + Ocupacao (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AreaChart 
            title="Evolução de Consultas"
            subtitle="Volume de atendimento nos últimos 7 dias"
            data={chartData}
            isLoading={isLoadingChart}
            className="shadow-sm h-full"
          />
        </div>
        
        <div className="lg:col-span-1 border border-neutral-100 bg-white rounded-xl shadow-sm p-6 flex flex-col justify-center items-center">
          <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center mb-4">
            <Percent className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest text-center mb-2">Taxa de Ocupação</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black text-neutral-900">{stats?.taxaOcupacao || 0}</span>
            <span className="text-2xl font-bold text-neutral-400">%</span>
          </div>
          {stats?.tendencias?.ocupacao !== undefined && (
            <div className={`mt-4 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${stats.tendencias.ocupacao >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <TrendingUp className={`w-3.5 h-3.5 ${stats.tendencias.ocupacao < 0 && 'rotate-180'}`} />
              {stats.tendencias.ocupacao > 0 ? '+' : ''}{stats.tendencias.ocupacao}% vs período ant.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Upcoming (2/3) + Especialidades (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        <Card className="lg:col-span-1 shadow-sm flex flex-col p-6 max-h-[400px]">
           <h3 className="font-bold text-neutral-900 flex items-center gap-2 mb-6 shadow-sm pb-2 border-b border-neutral-100">
              <PieChart className="h-4 w-4 text-primary-500" /> Consultas por Especialidade
            </h3>
            
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
              {!stats?.distribuicaoEspecialidade || stats.distribuicaoEspecialidade.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-neutral-400 h-full">
                   <PieChart className="h-8 w-8 mb-2 opacity-20" />
                   <p className="text-sm font-medium">Sem dados no período</p>
                 </div>
              ) : (
                stats.distribuicaoEspecialidade.map((item, index) => {
                  const total = stats.distribuicaoEspecialidade.reduce((acc, curr) => acc + curr.value, 0);
                  const pct = Math.round((item.value / total) * 100);
                  
                  return (
                    <div key={index} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-neutral-700 truncate pr-2">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-neutral-900">{item.value}</span>
                          <span className="text-neutral-400 text-xs font-bold bg-neutral-100 px-1.5 py-0.5 rounded-sm">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
        </Card>
      </div>
    </div>
  );
}
