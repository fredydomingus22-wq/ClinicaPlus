import React from 'react';
import { 
  useDashboardStats
} from '../../hooks/useDashboard';
import { 
  KpiCard, 
  Card, 
  Button, 
  Skeleton
} from '@clinicaplus/ui';
import { 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Search,
  ChevronRight,
  TrendingUp,
  UserPlus,
  Stethoscope
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardRecepcao() {
  const navigate = useNavigate();
  const { data: stats, isLoading: loadingStats } = useDashboardStats('hoje');
  
  // Quick Actions for Receptionists
  const quickActions = [
    { label: 'Novo Agendamento', icon: Calendar, color: 'bg-primary-600', path: '/recepcao/agendamentos' },
    { label: 'Registar Paciente', icon: UserPlus, color: 'bg-success-600', path: '/recepcao/pacientes' },
    { label: 'Lista de Hoje', icon: Clock, color: 'bg-amber-600', path: '/recepcao/hoje' },
  ];

  return (
    <div className="max-w-screen-xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Painel de Controlo</h1>
          <p className="text-sm text-neutral-600 mt-1">Bem-vindo, aqui está o resumo operacional de hoje.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 uppercase tracking-widest bg-white px-3 py-2 rounded-lg border border-neutral-100 shadow-sm">
          <Clock className="h-3 w-3 text-primary-500" /> Atualizado em: {new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label="Total Pacientes" 
          value={stats?.totalPacientes ?? 0} 
          icon={Users} 
          color="blue"
          loading={loadingStats}
          trend={{ value: 12, isPositive: true }}
        />
        <KpiCard 
          label="Consultas Hoje" 
          value={stats?.consultasHoje ?? 0} 
          icon={Calendar} 
          color="green"
          loading={loadingStats}
        />
        <KpiCard 
          label="A Aguardar" 
          value={stats?.aAguardar ?? 0} 
          icon={Clock} 
          color="amber"
          loading={loadingStats}
        />
        <KpiCard 
          label="Receitas Ativas" 
          value={stats?.receitasAtivas ?? 0} 
          icon={FileText} 
          color="slate"
          loading={loadingStats}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Operational Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions Card */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary-500" /> Ações Rápidas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-neutral-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
                >
                  <div className={`h-12 w-12 rounded-full ${action.color} text-white flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-700">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Today's Overview Preview */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Agendamentos Próximos
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/recepcao/hoje')}>
                Ver todos <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="p-0 divide-y divide-neutral-100">
              {loadingStats ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton variant="circle" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-1/3" />
                      <Skeleton variant="text" className="w-1/4" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-neutral-200" />
                  </div>
                  <p className="text-sm text-neutral-600 font-medium">Use a página "Hoje" para gerir o fluxo de pacientes em tempo real.</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/recepcao/hoje')}>
                    Abrir Gestão Diária
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Side Column - Insights & Search */}
        <div className="space-y-8">
          <Card className="p-6 bg-primary-900 text-white border-0 shadow-xl overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2 text-white">Dica de Eficiência</h3>
              <p className="text-white text-sm leading-relaxed mb-6 opacity-90">
                Pode realizar a triagem assim que o paciente chegar. Isso reduz o tempo de espera no consultório médico.
              </p>
              <Button variant="ghost" className="text-white hover:bg-white/10 border-white/20 w-full justify-between hover:text-teal-400 transition-colors">
                Saber mais <TrendingUp className="h-4 w-4" />
              </Button>
            </div>
            <Stethoscope className="absolute -bottom-6 -right-6 h-32 w-32 text-white/10 rotate-12" />
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-neutral-400" /> Pesquisa Rápida
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-neutral-700 font-medium">Encontre prontuários ou agendamentos instantaneamente.</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input 
                  type="text"
                  placeholder="Nome ou Nº Paciente..."
                  className="w-full h-11 pl-10 pr-4 text-sm border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-inner bg-neutral-50"
                  onClick={() => navigate('/recepcao/pacientes')}
                  readOnly
                />
              </div>
              <div className="pt-2">
                <Button fullWidth variant="secondary" onClick={() => navigate('/recepcao/pacientes')}>
                  Ver Base de Pacientes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
