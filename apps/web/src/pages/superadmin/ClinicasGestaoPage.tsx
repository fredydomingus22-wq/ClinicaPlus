import React, { useState } from 'react';
import { 
  Search, 
  Eye,
  Settings,
  X,
  Building2,
  TrendingUp,
  CreditCard,
  History,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { SlidePanel } from './components/SlidePanel';
import { useSuperAdminClinicas, useUpdateClinica } from '../../hooks/useSuperAdmin';
import { ClinicaDTO, PaginatedResult, Plano } from '@clinicaplus/types';
import { formatKwanza } from '@clinicaplus/utils';
import { Link } from 'react-router-dom';

interface ClinicaListItem extends ClinicaDTO {
  agendamentos30d?: number;
  receita30d?: number;
  ultimaActividade?: string;
}

export function ClinicasGestaoPage() {
  const [selectedClinica, setSelectedClinica] = useState<ClinicaListItem | null>(null);
  const [search, setSearch] = useState<string>('');
  const [planoFilter, setPlanoFilter] = useState<string>('');
  const [ativoFilter, setAtivoFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const filters: { page: number; limit: number; q?: string; plano?: string; ativo?: string } = {
    page,
    limit: 10
  };
  if (search) filters.q = search;
  if (planoFilter) filters.plano = planoFilter;
  if (ativoFilter) filters.ativo = ativoFilter;

  // Fetch clinicas using tanstack query from hook
  const { data: response, isLoading } = useSuperAdminClinicas(filters);

  const updateMutation = useUpdateClinica();

  const clinicas = (response as PaginatedResult<ClinicaListItem> | undefined)?.items || [];
  const totalPaginas = Math.ceil(((response as PaginatedResult<ClinicaListItem> | undefined)?.total || 0) / 10);

  return (
    <div className="p-6 lg:p-10 min-h-full flex flex-col space-y-8">
      
      {/* Header & Advanced Filters */}
      <div className="space-y-6 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Monitor de Rede</h1>
          <p className="text-sa-text-muted text-sm uppercase">Controlo operacional cross-tenant em tempo real</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 bg-sa-background/40 border border-sa-border p-4 rounded-xl">
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 text-sa-text-muted absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-sa-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por clínica, slug ou email..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-[#050505] border border-sa-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-sa-primary/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <select 
               value={planoFilter}
               onChange={(e) => { setPlanoFilter(e.target.value); setPage(1); }}
               className="bg-[#050505] border border-sa-border text-sa-text-muted text-xs rounded-lg px-3 py-2.5 focus:border-sa-primary outline-none"
             >
                <option value="">TODOS OS PLANOS</option>
                <option value="BASICO">BÁSICO</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
             </select>

             <select 
               value={ativoFilter}
               onChange={(e) => { setAtivoFilter(e.target.value); setPage(1); }}
               className="bg-[#050505] border border-sa-border text-sa-text-muted text-xs rounded-lg px-3 py-2.5 focus:border-sa-primary outline-none"
             >
                <option value="">ESTADO: TODOS</option>
                <option value="true">ATIVOS</option>
                <option value="false">SUSPENSOS</option>
             </select>

             {(search || planoFilter || ativoFilter) && (
               <button 
                onClick={() => { setSearch(''); setPlanoFilter(''); setAtivoFilter(''); setPage(1); }}
                className="p-2.5 rounded-lg bg-sa-destructive/10 text-sa-destructive hover:bg-sa-destructive hover:text-white transition-all shadow-sm"
               >
                 <X className="w-4 h-4" />
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Advanced Data Grid */}
      <div className="flex-1 bg-[#050505] border border-sa-border rounded-2xl overflow-hidden flex flex-col min-h-0 relative z-0">
        
        {/* Superior Stats Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sa-border bg-white/5 shrink-0">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sa-primary" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">{ (response as PaginatedResult<ClinicaListItem> | undefined)?.total || 0 } Clínicas Totais</span>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <button 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1 px-3 text-[10px] font-bold text-sa-text-muted hover:text-white bg-white/5 border border-white/10 rounded disabled:opacity-20 uppercase tracking-widest"
              >
                Anterior
              </button>
              <span className="text-[10px] font-mono text-sa-text-dim px-2">PAG {page} / {totalPaginas > 0 ? totalPaginas : 1}</span>
              <button 
                disabled={page >= totalPaginas}
                onClick={() => setPage(p => p + 1)}
                className="p-1 px-3 text-[10px] font-bold text-sa-text-muted hover:text-white bg-white/5 border border-white/10 rounded disabled:opacity-20 uppercase tracking-widest"
              >
                Próximo
              </button>
           </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-sa-border bg-[#080808] text-[9px] text-sa-text-dim uppercase tracking-[2px] font-bold shrink-0">
          <div className="col-span-3">Nome / Identificador</div>
          <div className="col-span-1">Plano</div>
          <div className="col-span-2">Agendamentos (30d)</div>
          <div className="col-span-2">Receita (30d)</div>
          <div className="col-span-2">Última Actividade</div>
          <div className="col-span-1 text-center">Estado</div>
          <div className="col-span-1 text-right">Acções</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 divide-y divide-white/[0.03] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-sa-primary opacity-40" />
              <p className="text-xs text-sa-text-dim uppercase tracking-[3px]">A carregar satélites...</p>
            </div>
          ) : clinicas.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-20">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-sm text-sa-text-muted font-medium italic opacity-50">
                Nenhum sinal detectado com os filtros actuais
              </p>
            </div>
          ) : (
            clinicas.map((clinica: ClinicaListItem) => (
              <div 
                key={clinica.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-white/[0.015] transition-all"
              >
                <div className="col-span-3 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#080808] border border-white/5 group-hover:border-sa-primary/30 flex items-center justify-center shrink-0 transition-all">
                    <Building2 className="w-5 h-5 text-sa-text-dim group-hover:text-sa-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-sa-primary transition-colors underline-offset-4 cursor-pointer" onClick={() => setSelectedClinica(clinica)}>{clinica.nome}</p>
                    <p className="text-[10px] font-mono text-sa-text-dim truncate tracking-wider uppercase">{clinica.slug}</p>
                  </div>
                </div>
                
                <div className="col-span-1">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/10 bg-white/5 text-sa-text-muted uppercase tracking-tighter">
                    {clinica.plano}
                  </span>
                </div>
                
                <div className="col-span-2 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-sa-primary opacity-30" />
                  <span className="text-xs text-white/80 font-mono tracking-wider">{clinica.agendamentos30d || 0}</span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <CreditCard className="w-3 h-3 text-amber-500/30" />
                  <span className="text-xs text-amber-200/90 font-mono tracking-wider">{formatKwanza(clinica.receita30d || 0)}</span>
                </div>

                <div className="col-span-2 flex items-center gap-2 text-sa-text-dim">
                  <History className="w-3 h-3 opacity-30" />
                  <span className="text-[10px] font-mono leading-none">
                    {clinica.ultimaActividade ? new Date(clinica.ultimaActividade).toLocaleDateString('pt-AO') : 'Sem registos'}
                  </span>
                </div>

                <div className="col-span-1 flex justify-center">
                   <div className={`w-2.5 h-2.5 rounded-full ${clinica.ativo ? 'bg-sa-primary shadow-[0_0_8px_rgba(20,184,166,0.3)]' : 'bg-sa-destructive shadow-[0_0_8px_rgba(225,29,72,0.3)]'}`} title={clinica.ativo ? 'Activo' : 'Suspenso'} />
                </div>

                <div className="col-span-1 flex items-center justify-end gap-1">
                   <Link 
                     to={`/superadmin/clinicas/${clinica.id}`}
                     className="p-2 text-sa-text-dim hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                     title="Ver Detalhes"
                   >
                     <Eye className="w-4 h-4" />
                   </Link>
                   <button 
                     onClick={() => setSelectedClinica(clinica)}
                     className="p-2 text-sa-text-dim hover:text-sa-primary hover:bg-white/5 rounded-lg transition-colors"
                     title="Definições Rápidas"
                   >
                     <Settings className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Slide Context Panel for Fast Actions */}
      <SlidePanel
        isOpen={!!selectedClinica}
        onClose={() => setSelectedClinica(null)}
        title={selectedClinica?.nome || 'Operações Rápidas'}
        subtitle={`Gestão directa de privilégios e subscrição`}
      >
        {selectedClinica && (
          <div className="space-y-8 p-1">
            
            {/* Health Snapshot Header */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center">
                 <p className="text-[9px] text-sa-text-dim uppercase font-bold tracking-widest mb-2">Estado Activo</p>
                 <div className={`w-3 h-3 rounded-full ${selectedClinica.ativo ? 'bg-sa-primary animate-pulse' : 'bg-sa-destructive'} mb-1`} />
                 <span className={`text-xs font-bold uppercase tracking-widest ${selectedClinica.ativo ? 'text-sa-primary' : 'text-sa-destructive'}`}>
                    {selectedClinica.ativo ? 'Operante' : 'Suspenso'}
                 </span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center">
                 <p className="text-[9px] text-sa-text-dim uppercase font-bold tracking-widest mb-2">Plano Atual</p>
                 <span className="text-emerald-400 font-mono text-xs font-bold uppercase">{selectedClinica.plano}</span>
              </div>
            </div>

            {/* Ações de Estado */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-[4px] border-b border-sa-border pb-2 opacity-40">Controlo de Acesso</h4>
              <button 
                onClick={() => {
                  if (!selectedClinica) return;
                  updateMutation.mutate({ id: selectedClinica.id, data: { ativo: !selectedClinica.ativo } });
                  setSelectedClinica((prev) => prev ? { ...prev, ativo: !prev.ativo } : null);
                }}
                disabled={updateMutation.isPending}
                className={`w-full p-6 rounded-2xl border transition-all flex justify-between items-center group ${
                  selectedClinica.ativo 
                    ? 'bg-sa-destructive/5 border-sa-destructive/20 hover:border-sa-destructive' 
                    : 'bg-sa-primary/5 border-sa-primary/20 hover:border-sa-primary'
                }`}
              >
                <div className="text-left">
                  <p className={`font-bold text-lg leading-tight uppercase tracking-tighter ${selectedClinica.ativo ? 'text-sa-destructive' : 'text-sa-primary'}`}>
                    {selectedClinica.ativo ? 'Suspender Operações' : 'Activar Operações'}
                  </p>
                  <p className="text-[11px] text-sa-text-muted mt-2 max-w-[240px]">
                    Irá afectar logins, APIs e webhooks imediatamente.
                  </p>
                </div>
                <div className={`p-3 rounded-2xl transition-all group-hover:scale-110 ${selectedClinica.ativo ? 'bg-sa-destructive/10 text-sa-destructive' : 'bg-sa-primary/10 text-sa-primary'}`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </button>
            </div>

            {/* Gestão de Plano */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-white uppercase tracking-[4px] border-b border-sa-border pb-2 opacity-40">Nível de Subscrição</h4>
               <div className="grid grid-cols-3 gap-2">
                 {['BASICO', 'PRO', 'ENTERPRISE'].map(plano => (
                   <button 
                    key={plano}
                    onClick={() => {
                      if (!selectedClinica) return;
                      const novoPlano = plano as Plano;
                      updateMutation.mutate({ id: selectedClinica.id, data: { plano: novoPlano } });
                      setSelectedClinica((prev) => prev ? { ...prev, plano: novoPlano } : null);
                    }}
                    className={`py-6 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        selectedClinica.plano === plano 
                        ? 'bg-sa-primary text-sa-background border-sa-primary shadow-[0_0_15px_rgba(20,184,166,0.3)]' 
                        : 'bg-[#050505] border-sa-border text-sa-text-dim hover:border-white/30'
                    }`}
                   >
                     {plano}
                   </button>
                 ))}
               </div>
               <p className="text-[10px] text-sa-text-muted text-center italic">
                 Alterar o plano irá recalcular as quotas de utilizadores e storage instantaneamente.
               </p>
            </div>

            <div className="pt-8 flex gap-4">
               <Link 
                 to={`/superadmin/clinicas/${selectedClinica.id}`}
                 className="flex-1 bg-white text-black font-bold py-4 rounded-xl text-center text-xs uppercase tracking-widest hover:bg-sa-primary hover:text-sa-background transition-all"
                >
                 Ver Perfil Completo
               </Link>
            </div>

          </div>
        )}
      </SlidePanel>

    </div>
  );
}

