import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  Card,
  Input,
  Button,
  Select,
  Badge
} from '@clinicaplus/ui';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { apiClient } from '../../api/client';
import { ChevronDown, ChevronRight, FileJson, Clock, User } from 'lucide-react';

interface AuditLog {
  id: string;
  actorId: string;
  actorTipo: string;
  accao: string;
  recurso: string;
  recursoId: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  ip: string | null;
  criadoEm: string;
}

const AuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    recurso: '',
    accao: 'all',
    actorId: '',
    inicio: '',
    fim: ''
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, v]) => key !== '' && v !== '' && v !== 'all')
        )
      });
      const response = await apiClient.get(`/audit-logs?${params.toString()}`);
      return response.data;
    }
  });

  const columns = [
    {
      header: '',
      width: '40px',
      accessor: (log: AuditLog) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-1 h-6 w-6" 
          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
        >
          {expandedId === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </Button>
      )
    },
    {
      header: 'Data',
      accessor: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          < Clock size={12} className="text-neutral-400" />
          <span className="text-xs font-medium text-neutral-600">
            {format(new Date(log.criadoEm), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
          </span>
        </div>
      )
    },
    {
      header: 'Actor',
      accessor: (log: AuditLog) => (
        <div className="flex items-center gap-2">
          <User size={12} className="text-primary-500" />
          <div className="flex flex-col">
            <span className="font-bold text-[10px] text-neutral-900">{log.actorId}</span>
            <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-tighter">{log.actorTipo}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Acção',
      accessor: (log: AuditLog) => (
        <Badge variant={
          log.accao === 'CREATE' ? 'success' :
          log.accao === 'DELETE' ? 'error' :
          log.accao === 'UPDATE' ? 'info' :
          'neutral'
        } className="text-[9px] font-bold px-1.5 py-0">
          {log.accao}
        </Badge>
      )
    },
    {
      header: 'Recurso',
      accessor: (log: AuditLog) => (
        <div className="flex flex-col">
          <span className="font-mono text-[10px] font-bold text-neutral-700">{log.recurso}</span>
          <span className="text-[9px] text-neutral-400 font-mono truncate max-w-[120px]">{log.recursoId || '---'}</span>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Logs de Auditoria</h1>
          <p className="text-sm text-neutral-500 font-medium tracking-tight">Rastreamento de todas as alterações críticas efectuadas no sistema.</p>
        </div>
      </div>

      <Card className="p-4 bg-neutral-50/50 border-neutral-100">
         <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input 
            placeholder="Filtrar Recurso..." 
            value={filters.recurso}
            className="h-9 text-xs"
            onChange={(e) => setFilters(prev => ({ ...prev, recurso: e.target.value }))}
          />
          <Select 
            value={filters.accao} 
            className="h-9 text-xs"
            options={[
              { value: 'all', label: 'Todas as Acções' },
              { value: 'CREATE', label: 'CREATE' },
              { value: 'UPDATE', label: 'UPDATE' },
              { value: 'DELETE', label: 'DELETE' },
              { value: 'LOGIN', label: 'LOGIN' },
              { value: 'EXPORT', label: 'EXPORT' }
            ]}
            onChange={(e) => setFilters(prev => ({ ...prev, accao: e.target.value }))}
          />
          <Input 
            placeholder="ID do Utilizador" 
            value={filters.actorId}
            className="h-9 text-xs"
            onChange={(e) => setFilters(prev => ({ ...prev, actorId: e.target.value }))}
          />
          <Input 
            type="date" 
            value={filters.inicio}
            label="Início"
            className="h-9 text-xs"
            onChange={(e) => setFilters(prev => ({ ...prev, inicio: e.target.value }))}
          />
          <Input 
            type="date" 
            value={filters.fim}
            label="Fim"
            className="h-9 text-xs"
            onChange={(e) => setFilters(prev => ({ ...prev, fim: e.target.value }))}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border-neutral-100 shadow-sm">
        <Table 
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          keyExtractor={(log) => log.id}
          renderExpandedRow={(log: AuditLog) => expandedId === log.id ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50/50 border-t border-neutral-100">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                  <FileJson size={10} /> Antes
                </h4>
                <div className="bg-white border border-neutral-100 rounded p-2 overflow-auto max-h-40">
                  <pre className="text-[10px] font-mono text-neutral-600">
                    {log.antes ? JSON.stringify(log.antes, null, 2) : '// Sem dados'}
                  </pre>
                </div>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                  <FileJson size={10} /> Depois
                </h4>
                <div className="bg-white border border-neutral-100 rounded p-2 overflow-auto max-h-40">
                  <pre className="text-[10px] font-mono text-neutral-600">
                    {log.depois ? JSON.stringify(log.depois, null, 2) : '// Sem dados'}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        />
        
        <div className="p-4 flex justify-between items-center bg-white border-t border-neutral-100">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Página {page} de {data?.pagination.pages || 1}
          </span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-4 text-xs font-bold uppercase tracking-widest"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-4 text-xs font-bold uppercase tracking-widest border-neutral-100"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= (data?.pagination.pages || 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogPage;
