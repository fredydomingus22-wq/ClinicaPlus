import React, { useState } from 'react';
import { useSystemLogs } from '../../hooks/useSuperAdmin';
import { useDebounce } from '../../hooks/useDebounce';
import { Table, Button, Badge, Input, Select, ErrorMessage } from '@clinicaplus/ui';
import { Terminal, Search } from 'lucide-react';
import type { SystemLogDTO } from '../../api/superadmin';

export function SALogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [page, setPage] = useState(1);
  const [nivelFilter, setNivelFilter] = useState('');

  const { data, isLoading, error } = useSystemLogs({
    page,
    limit: 15,
    q: (debouncedSearch || undefined) as string | undefined,
    nivel: (nivelFilter || undefined) as string | undefined
  });

  const columns = [
    {
      header: 'Timestamp',
      accessor: (l: SystemLogDTO) => (
        <span className="font-mono text-xs text-sa-text-muted">
         {new Date(l.criadoEm).toLocaleString('pt-AO')}
        </span>
      )
    },
    {
      header: 'Nível',
      accessor: (l: SystemLogDTO) => {
        let variant: "primary" | "warning" | "success" | "neutral" | "error" | "info" = 'neutral';
        if (l.nivel === 'CRITICO') variant = 'error';
        else if (l.nivel === 'ERRO') variant = 'error';
        else if (l.nivel === 'AVISO') variant = 'warning';
        else if (l.nivel === 'INFO') variant = 'info';
        
        return <Badge variant={variant}>{l.nivel}</Badge>;
      }
    },
    {
      header: 'Utilizador',
      accessor: (l: SystemLogDTO) => (
        <span className="text-sm font-semibold text-white">{l.utilizadorNome}</span>
      )
    },
    {
      header: 'Mensagem e Ação',
      accessor: (l: SystemLogDTO) => (
        <div>
          {l.acao && <span className="text-xs font-mono font-bold uppercase text-sa-primary/80 mr-2">[{l.acao?.replace(/_/g, ' ')}]</span>}
          <span className="text-sm text-white/90">{l.mensagem}</span>
        </div>
      )
    }
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in w-full max-w-7xl mx-auto pb-20">
      
      <div className="border border-sa-primary/30 bg-sa-primary/5 rounded-xl p-4 flex gap-4 items-start shadow-sa-glow mb-8">
        <div className="h-10 w-10 shrink-0 rounded-full bg-sa-primary/20 flex items-center justify-center text-sa-primary border border-sa-primary/30">
          <Terminal className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sa-primary font-mono font-bold tracking-tight uppercase tracking-wider">Auditória do Sistema</h2>
          <p className="text-sa-text-muted text-sm mt-1 leading-relaxed">
            Registo detalhado de auditoria global. Monitorização de atividades e segurança em todas as clínicas do sistema.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-sa-surface border border-sa-border rounded-xl p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sa-text-muted" />
          <Input 
            placeholder="Pesquisar mensagens e ações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 w-full bg-sa-background border-sa-border text-white placeholder:text-gray-600 focus:ring-sa-primary/50"
          />
        </div>
        <div className="w-full sm:w-64">
           <Select 
            placeholder="Filtrar por Nível"
            options={[
              { value: '', label: 'Todos os Níveis' },
              { value: 'INFO', label: 'Informativo' },
              { value: 'AVISO', label: 'Aviso' },
              { value: 'ERRO', label: 'Erro' },
              { value: 'CRITICO', label: 'Crítico' },
            ]}
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value)}
            className="w-full bg-sa-background border-sa-border text-white focus:ring-sa-primary/50"
          />
        </div>
      </div>

      <div className="bg-sa-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {error ? (
          <div className="p-8">
            <ErrorMessage error={error} />
          </div>
        ) : (
          <Table 
            columns={columns}
            data={data?.items || []}
            isLoading={isLoading}
            keyExtractor={(l) => l.id}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="font-mono text-xs text-sa-text-muted px-4 py-2 rounded-lg bg-sa-primary/10 border border-sa-primary/30 text-sa-primary shadow-sa-glow">
          TOTAL DE REGISTOS: {data?.total || 0}
        </span>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}
            className="border border-sa-border text-sa-text-muted hover:text-white"
          >
            ← ANTERIOR
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={page >= (Math.ceil((data?.total || 0) / 15) || 1)} 
            onClick={() => setPage(p => p + 1)}
            className="border border-sa-border text-sa-text-muted hover:text-white"
          >
            PRÓXIMO →
          </Button>
        </div>
      </div>

    </div>
  );
}
