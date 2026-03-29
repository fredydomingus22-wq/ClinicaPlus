import React from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowDownRight,
  Download,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PlanDistribution {
  plano: string;
  count: number;
}

interface CohortData {
  month: string;
  size: number;
  retention: (number | undefined)[];
}
import { useMRR, usePlansDistribution, useCohorts } from '../../hooks/useSuperAdmin';
import { formatKwanza } from '@clinicaplus/utils';

export function FinanceiroPage() {
  const { data: mrrData, isLoading: loadingMRR } = useMRR();
  const { data: plansData, isLoading: loadingPlans } = usePlansDistribution();
  const { data: cohortsData, isLoading: loadingCohorts } = useCohorts();

  const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6'];

  if (loadingMRR || loadingPlans || loadingCohorts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-sa-primary opacity-40" />
        <p className="text-xs text-sa-text-dim uppercase tracking-[3px]">A processar métricas financeiras...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Financeiro</h1>
          <p className="text-sa-text-muted text-sm uppercase">Análise de Receita, Planos e Retenção (MRR)</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-sa-background border border-sa-border rounded-lg text-[10px] font-bold text-sa-text-dim uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Exportar Relatório
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'MRR Actual', val: formatKwanza(mrrData?.currentMRR || 0), trend: `+${mrrData?.growth}%`, trendUp: true, icon: TrendingUp },
          { label: 'Ticket Médio', val: formatKwanza(65000), trend: '+5k', trendUp: true, icon: CreditCard },
          { label: 'Churn Rate (Monthly)', val: `${mrrData?.churnRate}%`, trend: '-0.2%', trendUp: true, icon: ArrowDownRight },
          { label: 'LTV Estimado', val: formatKwanza(1200000), trend: '+12%', trendUp: true, icon: Users }
        ].map((kpi, i) => (
          <div key={i} className="bg-sa-background/40 border border-sa-border p-6 rounded-2xl space-y-3">
             <div className="flex justify-between items-center text-sa-text-dim">
                <span className="text-[10px] font-bold uppercase tracking-widest">{kpi.label}</span>
                <kpi.icon className="w-4 h-4 opacity-40" />
             </div>
             <div className="flex items-end justify-between">
                <span className="text-2xl font-mono text-white font-medium">{kpi.val}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.trendUp ? 'bg-sa-primary/10 text-sa-primary' : 'bg-sa-destructive/10 text-sa-destructive'}`}>
                  {kpi.trend}
                </span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* MRR Chart */}
        <div className="col-span-12 lg:col-span-8 bg-[#050505] border border-sa-border rounded-3xl p-8 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px]">MRR Trend (Last 6 Months)</h3>
              <div className="flex items-center gap-4 text-[9px] font-bold text-sa-text-dim uppercase tracking-widest">
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sa-primary" /> Receita Base</div>
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Expansão</div>
              </div>
           </div>
           
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={mrrData?.series}>
                    <defs>
                      <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `${val/1000000}M`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="mrr" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Plan Distribution Chart */}
        <div className="col-span-12 lg:col-span-4 bg-[#050505] border border-sa-border rounded-3xl p-8 flex flex-col items-center justify-center space-y-8">
           <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] self-start">Plan Distribution</h3>
           <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={plansData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="count"
                    >
                      {plansData?.map((_entry: PlanDistribution, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#14b8a6'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                    />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           
           <div className="w-full space-y-3">
              {plansData?.map((p: PlanDistribution, i: number) => (
                <div key={i} className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-sa-text-dim font-bold uppercase">{p.plano}</span>
                   </div>
                   <span className="text-[10px] text-white font-mono">{p.count} clinicas</span>
                </div>
              ))}
           </div>
        </div>

        {/* Cohort Analysis Table */}
        <div className="col-span-12 bg-[#050505] border border-sa-border rounded-3xl overflow-hidden">
           <div className="p-8 border-b border-sa-border flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px]">Cohort Retention Analysis (Account)</h3>
              <span className="text-[9px] text-sa-text-muted italic">Mês 0 = 100% de ativação base</span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-white/[0.02]">
                       <th className="p-4 text-[9px] font-bold text-sa-text-dim uppercase tracking-widest border-b border-sa-border">Cohort</th>
                       <th className="p-4 text-[9px] font-bold text-sa-text-dim uppercase tracking-widest border-b border-sa-border">Size</th>
                       {Array.from({ length: 6 }).map((_, i) => (
                         <th key={i} className="p-4 text-[9px] font-bold text-sa-text-dim uppercase tracking-widest border-b border-sa-border text-center">M{i}</th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.03]">
                    {cohortsData?.map((c: CohortData, ci: number) => (
                      <tr key={ci} className="hover:bg-white/[0.01] transition-colors">
                         <td className="p-4 text-[10px] text-white font-bold">{c.month}</td>
                         <td className="p-4 text-[10px] text-sa-text-dim font-mono">{c.size}</td>
                         {Array.from({ length: 6 }).map((_, mi) => {
                           const val = c.retention[mi];
                           const opacity = val ? val / 100 : 0;
                           return (
                             <td key={mi} className="p-2 border border-white/[0.02]">
                                {val !== undefined ? (
                                  <div 
                                    className="w-full h-8 flex items-center justify-center text-[10px] text-white font-mono rounded"
                                    style={{ backgroundColor: `rgba(20, 184, 166, ${opacity * 0.4})` }}
                                  >
                                    {val}%
                                  </div>
                                ) : (
                                  <div className="w-full h-8" />
                                )}
                             </td>
                           );
                         })}
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
}
