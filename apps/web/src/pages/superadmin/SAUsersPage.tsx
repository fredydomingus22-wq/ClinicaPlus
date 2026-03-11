import React, { useState } from 'react';
import { useGlobalUsers, useUpdateGlobalUser } from '../../hooks/useSuperAdmin';
import { useDebounce } from '../../hooks/useDebounce';
import { Table, Button, Badge, Avatar, Input, Select, ErrorMessage } from '@clinicaplus/ui';
import { ShieldAlert, Search, UserX, UserCheck } from 'lucide-react';
import type { GlobalUserDTO } from '../../api/superadmin';

export function SAUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading, error } = useGlobalUsers({
    page,
    limit: 15,
    q: (debouncedSearch || undefined) as string | undefined,
    papel: (roleFilter || undefined) as string | undefined,
    ativo: undefined
  });

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateGlobalUser();

  const toggleStatus = (u: GlobalUserDTO) => {
    if (confirm(`Tem a certeza que deseja ${u.ativo ? 'suspender' : 'ativar'} o utilizador ${u.nome} do sistema global?`)) {
      updateStatus({ id: u.id, ativo: !u.ativo });
    }
  };

  const columns = [
    {
      header: 'Utilizador',
      accessor: (u: GlobalUserDTO) => (
        <div className="flex items-center gap-3">
          <Avatar initials={u.nome.split(' ').map((n: string) => n[0]).join('')} size="sm" />
          <div>
            <p className="font-semibold text-white">{u.nome}</p>
            <p className="text-xs text-sa-text-muted">{u.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Tenant / Clínica',
      accessor: (u: GlobalUserDTO) => (
        <span className="text-sm font-mono text-sa-text-muted bg-white/5 px-2 py-1 rounded">
          {u.clinicaNome}
        </span>
      )
    },
    {
      header: 'Papel',
      accessor: (u: GlobalUserDTO) => {
        let color: "info" | "warning" | "success" | "neutral" | "error" = 'neutral';
        if (u.papel === 'SUPER_ADMIN') color = 'error';
        else if (u.papel === 'ADMIN') color = 'info';
        else if (u.papel === 'MEDICO') color = 'warning';
        else if (u.papel === 'RECEPCIONISTA') color = 'success';
        
        return <Badge variant={color}>{u.papel}</Badge>;
      }
    },
    {
      header: 'Estado',
      accessor: (u: GlobalUserDTO) => (
        u.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="error">Suspenso</Badge>
      )
    },
    {
      header: 'Ação',
      align: 'right' as const,
      accessor: (u: GlobalUserDTO) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => toggleStatus(u)}
          disabled={isUpdating}
          className={`h-8 w-8 p-0 ${u.ativo ? 'text-sa-warning hover:text-sa-warning/80 hover:bg-sa-warning/10' : 'text-sa-primary hover:text-sa-primary/80 hover:bg-sa-primary/10'}`}
          title={u.ativo ? 'Suspender Conta' : 'Ativar Conta'}
        >
          {u.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
        </Button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-6 animate-fade-in w-full max-w-7xl mx-auto pb-20">
      
      <div className="border border-sa-destructive/30 bg-sa-destructive/5 rounded-xl p-4 flex gap-4 items-start shadow-sa-glow mb-8">
        <div className="h-10 w-10 shrink-0 rounded-full bg-sa-destructive/20 flex items-center justify-center text-sa-destructive border border-sa-destructive/30">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sa-destructive font-mono font-bold tracking-tight uppercase tracking-wider">Security Control Directory</h2>
          <p className="text-sa-text-muted text-sm mt-1 leading-relaxed">
            Área de ação direta na base de dados cross-tenant. Alterações de estado nesta secção suspendem os acessos globalmente, independentemente da clínica a que pertençam.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sa-text-muted" />
          <Input 
            placeholder="Pesquisar por email, nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 w-full bg-sa-background border-white/10 text-white placeholder:text-gray-600 focus:ring-sa-primary/50 focus:border-sa-primary/50"
          />
        </div>
        <div className="w-full sm:w-64">
           <Select 
            placeholder="Filtrar por Papel"
            options={[
              { value: '', label: 'Todos os Papéis' },
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
              { value: 'ADMIN', label: 'Admin (Dono)' },
              { value: 'MEDICO', label: 'Médico' },
              { value: 'RECEPCIONISTA', label: 'Recepcionista' },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-sa-background border-white/10 text-white focus:ring-sa-primary/50"
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
            keyExtractor={(u) => u.id}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="font-mono text-xs text-sa-text-muted px-4 py-2 rounded-lg bg-sa-primary/10 border border-sa-primary/30 text-sa-primary shadow-sa-glow">
          MATCHES: {data?.total || 0}
        </span>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}
            className="border border-white/10 text-sa-text-muted hover:text-white"
          >
            ← PREV
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={page >= (Math.ceil((data?.total || 0) / 15) || 1)} 
            onClick={() => setPage(p => p + 1)}
            className="border border-white/10 text-sa-text-muted hover:text-white"
          >
            NEXT →
          </Button>
        </div>
      </div>

    </div>
  );
}
