import React, { useState } from 'react';
import { 
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  UserCheck,
  UserX,
  Download,
  RefreshCw
} from 'lucide-react';
import { useGlobalUsers, useUpdateGlobalUser } from '../../hooks/useSuperAdmin';

const PAPEL_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:         { label: 'Admin',         color: 'text-blue-400 bg-blue-400/10' },
  MEDICO:        { label: 'Médico',        color: 'text-emerald-400 bg-emerald-400/10' },
  RECEPCIONISTA: { label: 'Recepcionista', color: 'text-amber-400 bg-amber-400/10' },
  PACIENTE:      { label: 'Paciente',      color: 'text-purple-400 bg-purple-400/10' },
  SUPER_ADMIN:   { label: 'SuperAdmin',    color: 'text-sa-primary bg-sa-primary/10' },
};

type GlobalUser = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  clinicaId: string | null;
  clinicaNome: string;
  criadoEm: string;
};

export function SAUsersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [papelFilter, setPapelFilter] = useState('');
  const [ativoFilter, setAtivoFilter] = useState('');

  const { data, isLoading, refetch } = useGlobalUsers({
    page,
    limit: 25,
    q: q || undefined,
    papel: papelFilter || undefined,
    ativo: ativoFilter || undefined,
  });

  const toggleMutation = useUpdateGlobalUser();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / 25) : 1;

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Utilizadores</h1>
          <p className="text-sa-text-muted text-sm uppercase tracking-widest">
            Gestão cross-tenant de todos os utilizadores da plataforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-lg bg-sa-background border border-sa-border text-sa-text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button className="px-4 py-2.5 bg-sa-background border border-sa-border rounded-lg text-[10px] font-bold text-sa-text-dim uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', val: data?.total ?? '—', icon: Users },
          { label: 'Activos', val: '—', icon: UserCheck },
          { label: 'Suspensos', val: '—', icon: UserX },
          { label: 'Clínicas cobertas', val: '—', icon: Building2 },
        ].map((s, i) => (
          <div key={i} className="bg-sa-background/40 border border-sa-border rounded-2xl p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-sa-primary/5 text-sa-primary">
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] text-sa-text-dim font-bold uppercase tracking-[2px]">{s.label}</p>
              <p className="text-xl font-mono text-white font-medium">{String(s.val)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sa-text-dim" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Pesquisar por nome, email ou clínica..."
            className="w-full bg-sa-background border border-sa-border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-sa-text-dim focus:outline-none focus:border-sa-primary transition-colors"
          />
        </form>

        <select
          value={papelFilter}
          onChange={e => { setPapelFilter(e.target.value); setPage(1); }}
          className="bg-sa-background border border-sa-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sa-primary transition-colors appearance-none"
        >
          <option value="">Todos os Papéis</option>
          <option value="ADMIN">Admin</option>
          <option value="MEDICO">Médico</option>
          <option value="RECEPCIONISTA">Recepcionista</option>
          <option value="PACIENTE">Paciente</option>
          <option value="SUPER_ADMIN">SuperAdmin</option>
        </select>

        <select
          value={ativoFilter}
          onChange={e => { setAtivoFilter(e.target.value); setPage(1); }}
          className="bg-sa-background border border-sa-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sa-primary transition-colors appearance-none"
        >
          <option value="">Estado: Todos</option>
          <option value="true">Activos</option>
          <option value="false">Suspensos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#050505] border border-sa-border rounded-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center gap-4 opacity-30">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs uppercase tracking-[3px]">A carregar utilizadores cross-tenant...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-sa-border">
                    {['Utilizador', 'Email', 'Papel', 'Clínica', 'Membro desde', 'Estado', 'Acções'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-bold text-sa-text-dim uppercase tracking-[3px] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {(data?.items as unknown as GlobalUser[] ?? []).map((user) => {
                    const papelMeta = PAPEL_LABELS[user.papel] ?? { label: user.papel, color: 'text-white bg-white/10' };
                    return (
                      <tr key={user.id} className="hover:bg-white/[0.015] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sa-primary/10 border border-sa-primary/20 flex items-center justify-center text-sa-primary text-xs font-bold flex-shrink-0">
                              {user.nome.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-white font-medium">{user.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-sa-text-muted font-mono">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${papelMeta.color}`}>
                            {papelMeta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-sa-text-muted">
                            <Building2 className="w-3 h-3 opacity-40 flex-shrink-0" />
                            {user.clinicaNome}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-sa-text-dim font-mono whitespace-nowrap">
                          {new Date(user.criadoEm).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest w-fit px-2 py-1 rounded-full ${
                            user.ativo ? 'text-sa-primary bg-sa-primary/10' : 'text-sa-destructive bg-sa-destructive/10'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${user.ativo ? 'bg-sa-primary' : 'bg-sa-destructive'}`} />
                            {user.ativo ? 'Activo' : 'Suspenso'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleMutation.mutate({ id: user.id, ativo: !user.ativo })}
                            disabled={toggleMutation.isPending}
                            title={user.ativo ? 'Suspender conta' : 'Reactivar conta'}
                            className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                              user.ativo
                                ? 'text-sa-destructive hover:bg-sa-destructive/10'
                                : 'text-sa-primary hover:bg-sa-primary/10'
                            }`}
                          >
                            {user.ativo ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-sa-border flex items-center justify-between">
                <span className="text-[10px] text-sa-text-dim font-mono">
                  Página {page} de {totalPages} · {data?.total} utilizadores
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-sa-border text-sa-text-muted hover:text-white hover:border-sa-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, page - 2) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                          pageNum === page
                            ? 'bg-sa-primary text-sa-background'
                            : 'border border-sa-border text-sa-text-muted hover:text-white hover:border-sa-primary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-sa-border text-sa-text-muted hover:text-white hover:border-sa-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
