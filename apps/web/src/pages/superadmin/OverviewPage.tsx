import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Activity, 
  CreditCard, 
  ChevronRight, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  ShieldAlert,
  Globe,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSuperAdminDashboard } from '../../hooks/useSuperAdmin';
import { ProvisionTenantModal } from './components/ProvisionTenantModal';
import { SystemBroadcastModal } from './components/SystemBroadcastModal';
import { formatKwanza } from '@clinicaplus/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface MRRChartEntry {
  month: string;
  amount: number;
}

interface CriticalEvent {
  id: string;
  mensagem: string;
  dataHora: string;
  origem: string;
}

interface DashboardData {
  activeClinicsCount: number;
  totalUtilizadores: number;
  totalAgendamentos: number;
  totalRevenue: number;
  mrrChartData: MRRChartEntry[];
  criticalEvents: CriticalEvent[];
  clinicas: {
    id: string;
    nome: string;
    plano: string;
  }[];
}

export function OverviewPage() {
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  const { data: dashboard, isLoading, isError } = useSuperAdminDashboard() as { data: DashboardData; isLoading: boolean; isError: boolean };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-sa-primary opacity-50" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center">
        <div className="bg-sa-destructive/10 border border-sa-destructive text-sa-destructive p-8 rounded-2xl max-w-lg mx-auto">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro de Telemetria</h2>
          <p className="text-sa-text-muted mb-6">Não foi possível estabelecer ligação com o núcleo de dados do sistema.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-sa-destructive text-white rounded-lg font-bold">Reiniciar Link</button>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: 'Clínicas Ativas', value: dashboard?.activeClinicsCount || 0, icon: Building2, color: 'text-emerald-400' },
    { title: 'Utilizadores Totais', value: dashboard?.totalUtilizadores || 0, icon: Users, color: 'text-blue-400' },
    { title: 'Volume Consultas', value: dashboard?.totalAgendamentos || 0, icon: Activity, color: 'text-sa-primary' },
    { title: 'MRR Atual', value: formatKwanza(dashboard?.totalRevenue || 0), icon: CreditCard, color: 'text-amber-400', neon: true },
    { title: 'Uptime API', value: '99.98%', icon: Zap, color: 'text-purple-400' },
    { title: 'Crescimento Mes', value: '+12.4%', icon: TrendingUp, color: 'text-emerald-500' },
    { title: 'Latência Média', value: '42ms', icon: Globe, color: 'text-sa-text-muted' },
    { title: 'Alertas Críticos', value: dashboard?.criticalEvents?.length || 0, icon: AlertTriangle, color: 'text-sa-destructive' },
  ];

  return (
    <div className="p-6 lg:p-10 min-h-full space-y-10">
      
      {/* KPI Grid - 2 lines on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-sa-background/40 border border-sa-border p-5 rounded-xl hover:border-sa-primary/30 transition-all group relative overflow-hidden">
            {kpi.neon && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-sa-primary/10 rounded-full blur-3xl -mr-8 -mt-8" />
            )}
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-sa-text-muted uppercase tracking-widest font-bold">{kpi.title}</p>
                <h3 className="text-xl font-display font-medium text-white">{kpi.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* MRR Bridge Chart */}
        <div className="xl:col-span-2 bg-sa-background/40 border border-sa-border rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-display text-lg text-white">MRR Bridge Performance</h3>
              <p className="text-xs text-sa-text-muted">Evolução mensal da faturação recorrente</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-sa-text-muted bg-white/5 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-full bg-sa-primary" /> SUBSCRITO
              </span>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.mrrChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  dy={10}
                />
                <YAxis 
                  hide={true}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [formatKwanza(value), 'Receita']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40}>
                  {dashboard?.mrrChartData?.map((_entry: MRRChartEntry, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === dashboard.mrrChartData.length - 1 ? '#14b8a6' : '#1e293b'} 
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Panel & Quick Tasks */}
        <div className="space-y-6">
          <div className="bg-sa-primary/5 border border-sa-primary/20 rounded-2xl p-6 relative overflow-hidden group">
            <h3 className="font-display text-lg text-white mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsProvisionModalOpen(true)}
                className="w-full bg-sa-primary text-sa-background font-bold py-3 rounded-lg hover:bg-white transition-all text-xs uppercase tracking-tighter"
              >
                Provisionar Nova Clínica
              </button>
              <button 
                onClick={() => setIsBroadcastModalOpen(true)}
                className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 rounded-lg hover:bg-white/10 transition-colors text-xs uppercase tracking-tighter"
              >
                Anúncio de Sistema
              </button>
            </div>
          </div>

          <div className="bg-sa-background/40 border border-sa-border rounded-2xl p-6">
            <h3 className="font-display text-sm text-white uppercase tracking-widest mb-6">Alarmes Críticos (24h)</h3>
            <div className="space-y-4">
              {dashboard?.criticalEvents?.map((event: CriticalEvent) => (
                <div key={event.id} className="flex gap-3 items-start group">
                  <div className="w-1.5 h-1.5 rounded-full bg-sa-destructive mt-1.5 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-white/90 leading-tight mb-1">{event.mensagem}</p>
                    <p className="text-[10px] text-sa-text-muted font-mono">
                      {new Date(event.dataHora).toLocaleTimeString()} — {event.origem}
                    </p>
                  </div>
                </div>
              ))}
              {!dashboard?.criticalEvents?.length && (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                  <p className="text-[10px] text-sa-text-dim uppercase">Sem ameaças detetadas</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Health Table for Clinics */}
      <div className="bg-sa-background/40 border border-sa-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-sa-border flex justify-between items-center">
            <h3 className="font-display text-lg text-white">Status das Clínicas Core</h3>
            <Link to="/superadmin/clinicas" className="text-[10px] font-mono text-sa-primary flex items-center gap-1 hover:underline uppercase tracking-widest">
                VER GESTÃO DE CLÍNICAS <ChevronRight className="w-3 h-3" />
            </Link>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white/5">
                    <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-sa-text-muted uppercase tracking-widest leading-none">Clínica</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-sa-text-muted uppercase tracking-widest leading-none">Plano</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-sa-text-muted uppercase tracking-widest leading-none">Estado Core</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-sa-text-muted uppercase tracking-widest leading-none text-right">Acções</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {dashboard?.clinicas?.map((clinica: { id: string; nome: string; plano: string }) => (
                        <tr key={clinica.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                                <span className="text-sm font-medium text-white">{clinica.nome}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-sa-text-muted uppercase">
                                    {clinica.plano}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                    <span className="text-xs text-sa-text-muted">Operacional</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Link 
                                    to={`/superadmin/clinicas/${clinica.id}`}
                                    className="p-2 rounded-lg text-sa-text-dim hover:text-white hover:bg-white/5 transition-all inline-block"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <ProvisionTenantModal 
        isOpen={isProvisionModalOpen} 
        onClose={() => setIsProvisionModalOpen(false)} 
      />

      <SystemBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />

    </div>
  );
}

