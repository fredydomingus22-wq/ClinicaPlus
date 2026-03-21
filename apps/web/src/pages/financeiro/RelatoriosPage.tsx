import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Input, 
  Table, 
  Spinner, 
  ErrorMessage
} from '@clinicaplus/ui';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShieldAlert, 
  Download, 
  BarChart3,
  User
} from 'lucide-react';
import { useRelatorioReceita, useExportReceita, type RelatorioFilters } from '../../hooks/useRelatorios';
import { useMedicos } from '../../hooks/useMedicos';
import { useClinicaMe } from '../../hooks/useClinicas';
import { formatKwanza } from '@clinicaplus/utils';
import { TipoFatura, Plano } from '@clinicaplus/types';
import { toast } from 'react-hot-toast';
import { PlanGate } from '../../components/PlanGate';

export default function RelatoriosPage() {
  const [filters, setFilters] = useState({
    periodo: 'mes', // mes, anterior, trimestre, custom
    inicio: '',
    fim: '',
    medicoId: '',
    tipo: ''
  });

  const { data: clinica } = useClinicaMe();
  const { data: medicos } = useMedicos({ page: 1, limit: 100 });
  
  // Calculate date range based on Periodo
  const dateRange = React.useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date();

    if (filters.periodo === 'anterior') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (filters.periodo === 'trimestre') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date();
    } else if (filters.periodo === 'custom' && filters.inicio && filters.fim) {
      start = new Date(filters.inicio);
      end = new Date(filters.fim);
    }

    return { inicio: start.toISOString().split('T')[0], fim: end.toISOString().split('T')[0] };
  }, [filters.periodo, filters.inicio, filters.fim]);

  const { data, isLoading, error } = useRelatorioReceita({
    ...dateRange,
    medicoId: filters.medicoId || undefined,
    tipo: filters.tipo || undefined,
    agrupamento: filters.periodo === 'trimestre' ? 'week' : 'day'
  } as RelatorioFilters);

  const exportMutation = useExportReceita();

  const handleExport = async () => {
    if (clinica?.plano === Plano.BASICO) {
      toast.error('A exportação está bloqueada no seu plano BÁSICO. Faça upgrade para PRO.');
      return;
    }
    try {
      await exportMutation.mutateAsync({
        ...dateRange,
        medicoId: filters.medicoId || undefined,
        tipo: filters.tipo || undefined
      } as RelatorioFilters);
      toast.success('Relatório exportado com sucesso!');
    } catch {
      toast.error('Erro na exportação.');
    }
  };

  return (
    <PlanGate planoMinimo={Plano.PRO}>
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Relatórios Financeiros</h1>
            <p className="text-sm text-neutral-500">Monitorize a receita e desempenho da clínica.</p>
          </div>
          <Button 
            variant="secondary" 
            loading={exportMutation.isPending}
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-50/50">
          <Select 
            label="Período"
            options={[
              { value: 'mes', label: 'Mês Corrente' },
              { value: 'anterior', label: 'Mês Anterior' },
              { value: 'trimestre', label: 'Último Trimestre' },
              { value: 'custom', label: 'Customizado' },
            ]}
            value={filters.periodo}
            onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
          />
          <Select 
            label="Médico"
            options={[
              { value: '', label: 'Todos os Médicos' },
              ...(medicos?.items || []).map(m => ({ value: m.id, label: m.nome }))
            ]}
            value={filters.medicoId}
            onChange={(e) => setFilters({ ...filters, medicoId: e.target.value })}
          />
          <Select 
            label="Tipo"
            options={[
              { value: '', label: 'Particular + Seguro' },
              { value: TipoFatura.PARTICULAR, label: 'Particular' },
              { value: TipoFatura.SEGURO, label: 'Seguro' },
            ]}
            value={filters.tipo}
            onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
          />
          {filters.periodo === 'custom' && (
            <div className="md:col-start-1 md:col-end-3 grid grid-cols-2 gap-4">
              <Input 
                label="Início" 
                type="date" 
                value={filters.inicio} 
                onChange={(e) => setFilters({ ...filters, inicio: e.target.value })} 
              />
              <Input 
                label="Fim" 
                type="date" 
                value={filters.fim} 
                onChange={(e) => setFilters({ ...filters, fim: e.target.value })} 
              />
            </div>
          )}
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-12"><Spinner size="lg" /></div>
        ) : error ? (
          <ErrorMessage error={error} />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <KPIItem 
                label="Receita Real" 
                value={formatKwanza(data?.totais.receita || 0)} 
                icon={<DollarSign className="text-success-600" />}
              />
              <KPIItem 
                label="Previsão (Rascunhos)" 
                value={formatKwanza(data?.totais.receitaPrevista || 0)} 
                icon={<BarChart3 className="text-primary-600" />}
                variant="info"
              />
              <KPIItem 
                label="Consultas" 
                value={data?.totais.consultas || 0} 
                icon={<Users className="text-primary-600" />}
              />
              <KPIItem 
                label="Média/Consulta" 
                value={formatKwanza(data?.totais.mediaConsulta || 0)} 
                icon={<TrendingUp className="text-amber-600" />}
              />
              <KPIItem 
                label="Seguros Pendentes" 
                value={formatKwanza(data?.totais.segurosPendentes || 0)} 
                icon={<ShieldAlert className="text-red-500" />}
                variant="error"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <Card className="lg:col-span-2 p-6 h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Evolução da Receita
                  </h3>
                </div>
                <div className="flex-1 flex items-end gap-2 pb-6 border-b border-neutral-100 relative">
                  {data?.serie.map((s, i) => {
                    const maxReceita = Math.max(...data.serie.map(x => x.receita), 1);
                    const height = (s.receita / maxReceita) * 100;
                    return (
                      <div key={i} className="flex-1 group relative flex flex-col items-center">
                        <div 
                          className="w-full bg-primary-100 group-hover:bg-primary-500 transition-all rounded-t-sm"
                          style={{ height: `${height}%`, minHeight: '2px' }}
                          title={`${new Date(s.periodo).toLocaleDateString()}: ${formatKwanza(s.receita)}`}
                        />
                        <span className="absolute -bottom-6 text-[8px] text-neutral-400 rotate-45 origin-left">
                          {new Date(s.periodo).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Breakdown Table */}
              <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-neutral-50 border-b border-neutral-100">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                    <User className="h-4 w-4" /> Por Médico
                  </h3>
                </div>
                <Table 
                  columns={[
                    { header: 'Médico', accessor: 'nome' },
                    { header: 'Consultas', accessor: 'consultas', className: 'text-center' },
                    { header: 'Receita', accessor: (row: { receita: number }) => <span className="font-bold">{formatKwanza(row.receita)}</span>, className: 'text-right' },
                  ]}
                  data={data?.porMedico || []}
                  keyExtractor={(row) => row.nome}
                />
              </Card>
            </div>
          </>
        )}
      </div>
    </PlanGate>
  );
}

function KPIItem({ label, value, icon, variant = 'info' }: { 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  variant?: 'info' | 'error';
}) {
  return (
    <Card className="p-4 relative overflow-hidden group">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${variant === 'error' ? 'bg-red-50' : 'bg-primary-50'} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
          <p className={`text-xl font-bold ${variant === 'error' ? 'text-red-600' : 'text-neutral-900'} font-mono`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
