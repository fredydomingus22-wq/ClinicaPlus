import React, { useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Filter, 
  Clock,
  Archive,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { 
  KpiCard, 
  Button, 
  Input, 
  Badge, 
  Select 
} from '@clinicaplus/ui';
import { useInventory } from '../../hooks/useInventory';
import { formatKwanza } from '@clinicaplus/utils';
import { subDays, format } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function InventoryDashboardPage() {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { 
    useAnalyticsKpis, 
    useTopMovimentados, 
    useTendenciaDiaria, 
    usePrevisaoRuptura,
    useDistribuicaoCategorias,
    useCategorias 
  } = useInventory();

  const activeFilters = {
    dataInicio: dateRange.start,
    dataFim: dateRange.end,
    ...(selectedCategory ? { categoriaId: selectedCategory } : {})
  };

  const { data: kpis } = useAnalyticsKpis(activeFilters);
  const { data: topItems } = useTopMovimentados({ ...activeFilters, limite: 8 });
  const { data: tendencia } = useTendenciaDiaria(activeFilters);
  const { data: ruptura } = usePrevisaoRuptura(30);
  const { data: distategorias } = useDistribuicaoCategorias(activeFilters);
  const { data: categorias } = useCategorias();

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header & Advanced Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            Analytics de Inventário
          </h1>
          <p className="text-sm text-neutral-500">Monitorização inteligente de stock, rotatividade e previsões.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
            <CalendarDays className="w-4 h-4 text-neutral-400 ml-2" />
            <Input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border-none bg-transparent focus:ring-0 text-sm h-8 w-36"
            />
            <span className="text-neutral-400 text-xs font-bold">ATÉ</span>
            <Input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border-none bg-transparent focus:ring-0 text-sm h-8 w-36"
            />
          </div>

          <div className="flex-1 lg:flex-none min-w-[180px]">
             <Select 
                options={[
                  { label: 'Todas Categorias', value: '' },
                  ...(categorias?.map(c => ({ label: c.nome, value: c.id })) || [])
                ]}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="Filtrar Categoria"
             />
          </div>
          
          <Button variant="outline" size="sm" className="h-10">
            <Filter className="w-4 h-4 mr-2" /> Outros Filtros
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          label="Valor Total em Stock" 
          value={formatKwanza(kpis?.valorTotalEstoque || 0)} 
          icon={Package} 
          color="blue"
          trend={{ value: 12, isPositive: true }}
          badgeText="+12% Crescimento"
        />
        <KpiCard 
          label="Taxa de Ruptura" 
          value={`${kpis?.taxaRuptura || 0}%`} 
          icon={AlertTriangle} 
          color={ (kpis?.taxaRuptura || 0) > 5 ? "red" : "amber" }
          badgeText={ (kpis?.taxaRuptura || 0) > 5 ? "Crítico" : "Sob controlo" }
        />
        <KpiCard 
          label="Dias de Cobertura (DSI)" 
          value={kpis?.diasEstoque || 0} 
          icon={Clock} 
          color="slate"
          badgeText="Disponibilidade"
        />
        <KpiCard 
          label="Rotatividade (Turnover)" 
          value={kpis?.taxaRotatividade || 0} 
          icon={TrendingUp} 
          color="green"
          trend={{ value: 8, isPositive: true }}
          badgeText="Alta Eficiência"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-neutral-800">Tendência de Movimentação</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary-500" />
                <span className="text-xs text-neutral-500 font-medium">Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger-500" />
                <span className="text-xs text-neutral-500 font-medium">Saídas</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tendencia || []}>
                <defs>
                  <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={str => format(new Date(str), 'dd MMM')}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={str => format(new Date(str as string), 'dd/MM/yyyy')}
                />
                <Area type="monotone" dataKey="entradas" stroke="#6366f1" fillOpacity={1} fill="url(#colorEnt)" strokeWidth={3} />
                <Area type="monotone" dataKey="saidas" stroke="#ef4444" fillOpacity={0} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="font-bold text-neutral-800 mb-6">Valor por Categoria</h2>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distategorias || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="valorEstoque"
                >
                  {distategorias?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={(entry.cor || COLORS[index % COLORS.length] || '#cbd5e1')} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: unknown) => formatKwanza(value as number)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Total</p>
              <p className="text-sm font-bold text-neutral-800">{formatKwanza(kpis?.valorTotalEstoque || 0)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {distategorias?.slice(0, 4).map((c, i) => (
              <div key={c.categoriaId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor || COLORS[i % COLORS.length] }} />
                  <span className="text-neutral-600 truncate max-w-[120px]">{c.nome}</span>
                </div>
                <span className="font-bold text-neutral-800">{formatKwanza(c.valorEstoque)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ABC Analysis / Top Moved */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="font-bold text-neutral-800 mb-4 flex items-center justify-between">
            Top Itens (Curva ABC)
            <Badge variant="neutral">Curva de Receita</Badge>
          </h2>
          <div className="space-y-4">
             {topItems?.map((item) => (
               <div key={item.produtoId} className="group flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-8 h-8 rounded text-white font-bold text-xs ${
                      item.classificacaoAbc === 'A' ? 'bg-indigo-500' : 
                      item.classificacaoAbc === 'B' ? 'bg-teal-500' : 'bg-slate-400'
                    }`}>
                      {item.classificacaoAbc}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-800 group-hover:text-primary-600 transition-colors uppercase">{item.nome}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">{item.categoria}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900">{formatKwanza(item.receita)}</p>
                    <p className="text-[10px] text-neutral-400">{item.totalSaidas} saídas</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Predictive Stock-out / Critical Status */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <h2 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
            Previsão de Ruptura 
            <Clock className="w-4 h-4 text-neutral-400 animate-pulse" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-neutral-400 font-bold border-b border-neutral-50">
                <tr>
                  <th className="pb-2">PRODUTO</th>
                  <th className="pb-2">ESTOQUE</th>
                  <th className="pb-2">ESTIMATIVA</th>
                  <th className="pb-2 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {ruptura?.slice(0, 10).map((item) => (
                  <tr key={item.produtoId} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 font-medium text-neutral-700 truncate max-w-[150px]">{item.nome}</td>
                    <td className="py-3 text-neutral-500">{item.estoqueAtual} unid.</td>
                    <td className="py-3 font-mono text-xs text-neutral-600">
                      {item.diasAteRuptura === 0 ? 'RUPTURA' : 
                       item.diasAteRuptura ? `${item.diasAteRuptura} dias` : 'Estável'}
                    </td>
                    <td className="py-3 text-right">
                      <Badge 
                        variant={
                          item.criticidade === 'CRITICA' ? 'error' : 
                          item.criticidade === 'ALTA' ? 'warning' : 'success'
                        }
                      >
                        {item.criticidade}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!ruptura || ruptura.length === 0) && (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
              <Archive className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs">Nenhum dado de ruptura disponível</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
