import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoFatura, FaturaDTO } from '@clinicaplus/types';
import { useFaturas } from '../../hooks/useFaturas';
import { useClinicaMe } from '../../hooks/useClinicas';
import { useEffect } from 'react';
import { 
  Button, 
  Card, 
  Table, 
  ErrorMessage,
  Input
} from '@clinicaplus/ui';
import { Plus, Search, Eye, FileText, Download } from 'lucide-react';
import { formatKwanza } from '@clinicaplus/utils';
import { FaturaStatusBadge } from '../../components/financeiro/FaturaStatusBadge';
import { FaturaPrint } from '../../components/print/FaturaPrint';
import { PlanGate, UpgradeInline } from '../../components/PlanGate';
import { useExportReceita } from '../../hooks/useRelatorios';

const ESTADO_FATURA_TABS = [
  { id: 'EMITIDA', label: 'Emitidas' },
  { id: 'RASCUNHO', label: 'Rascunhos' },
  { id: 'PAGA', label: 'Pagas' },
  { id: 'ANULADA', label: 'Anuladas' },
];

export default function FaturasPage() {
  const [tab, setTab] = useState<EstadoFatura>(EstadoFatura.EMITIDA);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [faturaToPrint, setFaturaToPrint] = useState<FaturaDTO | null>(null);

  const { data, isLoading, error } = useFaturas({
    estado: tab,
    page,
    limit: 15
  });
  
  const { data: clinica } = useClinicaMe();

  const exportMutation = useExportReceita();

  const handleExport = () => {
    exportMutation.mutate({});
  };

  const handlePrint = (f: FaturaDTO) => {
    setFaturaToPrint(f);
  };

  useEffect(() => {
    if (!faturaToPrint) return;

    // Pequeno delay para garantir que o componente de print renderizou
    const timer = setTimeout(() => {
      window.print();
      setFaturaToPrint(null);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [faturaToPrint]);

  const columns = [
    {
      header: 'Número',
      accessor: (f: FaturaDTO) => (
        <span className="font-mono text-xs font-bold text-primary-700">
          {f.numeroFatura || '---'}
        </span>
      )
    },
    {
      header: 'Paciente',
      accessor: (f: FaturaDTO) => (
        <div>
          <p className="font-semibold text-neutral-900">{f.paciente?.nome || '---'}</p>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
            {f.paciente?.numeroPaciente || 'Paciente'}
          </p>
        </div>
      )
    },
    {
      header: 'Total',
      accessor: (f: FaturaDTO) => (
        <span className="font-bold text-neutral-900">
          {formatKwanza(f.total)}
        </span>
      )
    },
    {
      header: 'Data',
      accessor: (f: FaturaDTO) => (
        <span className="text-sm text-neutral-600">
          {f.dataEmissao ? new Date(f.dataEmissao).toLocaleDateString() : new Date(f.criadoEm).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Estado',
      accessor: (f: FaturaDTO) => <FaturaStatusBadge estado={f.estado} />
    },
    {
      header: 'Acções',
      className: 'text-right',
      accessor: (f: FaturaDTO) => (
        <div className="flex justify-end gap-2">
          <Link to={`/admin/financeiro/${f.id}`}>
            <Button variant="ghost" size="sm" title="Ver Detalhes">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Imprimir" 
            disabled={f.estado === EstadoFatura.RASCUNHO}
            onClick={() => handlePrint(f)}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Facturação</h1>
          <p className="text-neutral-500 text-sm">Gestão de faturas, pagamentos e histórico financeiro.</p>
        </div>
        <div className="flex gap-2">
          <PlanGate 
            planoMinimo="PRO" 
            fallback={<UpgradeInline feature="Exportar CSV" />}
          >
            <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4 mr-2" /> 
              {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </PlanGate>
          
          <Link to="/admin/financeiro/nova">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova Fatura
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div className="flex gap-1">
              {ESTADO_FATURA_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id as EstadoFatura);
                    setPage(1);
                  }}
                  className={`
                    px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border-b-2
                    ${tab === t.id 
                      ? 'border-primary-500 text-primary-700 bg-white shadow-sm' 
                      : 'border-transparent text-neutral-400 hover:text-neutral-600'
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input 
                placeholder="Pesquisar..." 
                className="pl-10 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-8">
            <ErrorMessage error={error} />
          </div>
        ) : (
          <Table
            columns={columns}
            data={data?.items || []}
            isLoading={isLoading}
            keyExtractor={(f) => f.id}
          />
        )}

        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <span>Mostrando {data?.items?.length || 0} de {data?.total || 0} resultados</span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              disabled={!data || page * 15 >= data.total}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>

      {/* Hidden Print Component */}
      {faturaToPrint && clinica && (
        <FaturaPrint fatura={faturaToPrint} clinica={clinica} />
      )}
    </div>
  );
}
