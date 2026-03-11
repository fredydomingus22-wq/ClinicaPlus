import React, { useState } from 'react';
import { useReceitas } from '../../hooks/useReceitas';
import { useAuthStore } from '../../stores/auth.store';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Badge, 
  Avatar, 
  ErrorMessage,
  EmptyState,
  Pagination,
  ReceitaPrint
} from '@clinicaplus/ui';
import { ReceitaDTO } from '@clinicaplus/types';
import { 
  Search, 
  Printer, 
  FileText, 
  Calendar, 
  Filter, 
  Download
} from 'lucide-react';
import { formatDateTime, getInitials, exportToCsv, formatShortDate } from '@clinicaplus/utils';
import { useClinicaMe } from '../../hooks/useClinicas';

/**
 * Physician's Prescriptions Page.
 * Lists and manage issued medical prescriptions.
 */
export default function ReceitasPage() {
  const utilizador = useAuthStore(s => s.utilizador);
  const { data: clinica } = useClinicaMe();
  const [printingReceita, setPrintingReceita] = useState<ReceitaDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading, error } = useReceitas({ 
    medicoId: utilizador?.medico?.id,
    page, 
    limit: 10
  });

  const handleImprimir = (receita: ReceitaDTO) => {
    setPrintingReceita(receita);
    // Timeout to allow state to react and component to render before printing
    setTimeout(() => {
      window.print();
    }, 100);
  };
  
  const handleExportData = () => {
    if (!data?.items || data.items.length === 0) return;
    
    exportToCsv(
      'receitas_medicas',
      ['Paciente', 'Nº Paciente', 'Data Emissão', 'Data Validade', 'Diagnóstico'],
      data.items.map(r => [
        r.paciente?.nome || '---',
        r.paciente?.numeroPaciente || '---',
        r.criadoEm ? formatShortDate(r.criadoEm) : '---',
        r.dataValidade ? formatShortDate(r.dataValidade) : '---',
        r.diagnostico
      ])
    );
  };

  const columns = [
    {
      header: 'Paciente',
      accessor: (r: ReceitaDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(r.paciente?.nome || 'P')} size="sm" />
          <div>
            <p className="font-semibold text-neutral-900">{r.paciente?.nome || 'Paciente Desconhecido'}</p>
            <p className="text-xs text-neutral-500">{r.paciente?.numeroPaciente || '---'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Emissão',
      accessor: (r: ReceitaDTO) => (
        <div className="flex items-center gap-2 text-neutral-600">
          <Calendar className="h-3.5 w-3.5 opacity-50 text-primary-500" />
          <span className="text-sm">{r.criadoEm ? formatDateTime(r.criadoEm) : '---'}</span>
        </div>
      )
    },
    {
      header: 'Diagnóstico Relacionado',
      accessor: (r: ReceitaDTO) => (
        <p className="text-sm text-neutral-600 max-w-xs truncate font-medium" title={r.diagnostico}>
          {r.diagnostico}
        </p>
      )
    },
    {
      header: 'Validade',
      accessor: (r: ReceitaDTO) => {
        const isExpired = r.dataValidade && new Date(r.dataValidade) < new Date();
        const expiryDate = r.dataValidade ? new Date(r.dataValidade).toLocaleDateString('pt-AO') : '---';
        
        return (
          <Badge variant={isExpired ? 'error' : 'success'}>
            {isExpired ? 'Expirada' : `Válida até ${expiryDate}`}
          </Badge>
        );
      }
    },
    {
      header: '',
      align: 'right' as const,
      accessor: (r: ReceitaDTO) => (
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleImprimir(r)} 
            className="h-9 w-9 p-0 hover:bg-primary-50 hover:text-primary-600 transition-all" 
            title="Imprimir Receita"
          >
            <Printer className="h-4.5 w-4.5" />
          </Button>
          <Button variant="secondary" size="sm" className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider">
            Detalhes
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in pb-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Registo de Prescrições</h1>
          <p className="text-neutral-500 text-sm font-medium">Arquivo clínico de todas as receitas médicas emitidas.</p>
        </div>
        <Button variant="secondary" className="font-bold" onClick={handleExportData} disabled={!data?.items.length}>
          <Download className="h-4 w-4 mr-2" /> Exportar Dados
        </Button>
      </div>

      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input 
              placeholder="Pesquisar por paciente ou CID/Diagnóstico..."
              className="pl-10 h-11 bg-white border-neutral-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" className="text-neutral-500 font-bold">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </Button>
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
            keyExtractor={(r) => r.id}
          />
        )}

        {!isLoading && (!data || data.items.length === 0) && (
          <EmptyState 
            icon={FileText}
            title="Sem prescrições emitidas"
            description="Ainda não existem registos de receitas médicas para os filtros seleccionados."
            action={{
              label: "Limpar Pesquisa",
              onClick: () => setSearchTerm(''),
              variant: 'secondary'
            }}
          />
        )}

        <div className="p-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
           <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
             Sincronizado com Prontuário Digital • ClinicaPlus
           </p>
           {(data?.total || 0) > 10 && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-500 font-medium">Página {page} de {Math.ceil((data?.total || 0) / 10)}</span>
                <Pagination 
                  currentPage={page}
                  totalItems={data?.total || 0}
                  itemsPerPage={10}
                  onPageChange={setPage}
                />
              </div>
           )}
        </div>
      </Card>

      {printingReceita && (
        <ReceitaPrint
          receita={printingReceita}
          clinicaNome={clinica?.nome || 'ClinicaPlus'}
          clinicaEndereco={clinica?.endereco || null}
          clinicaTelefone={clinica?.telefone || null}
          clinicaEmail={clinica?.email || null}
        />
      )}
    </div>
  );
}
