import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Building2, ShieldAlert, Loader2, CheckCircle } from 'lucide-react';
import { SlidePanel } from './components/SlidePanel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '../../api/superadmin';
import type { ClinicaDTO } from '@clinicaplus/types';
import toast from 'react-hot-toast';

export function ClinicasGestaoPage() {
  const queryClient = useQueryClient();
  const [selectedClinica, setSelectedClinica] = useState<ClinicaDTO | null>(null);
  const [search, setSearch] = useState('');

  // Fetch clinicas using tanstack query
  const { data: response, isLoading } = useQuery({
    queryKey: ['sa-clinicas-list', { q: search }],
    queryFn: () => superAdminApi.getClinicas({ q: (search || undefined) as string | undefined }),
    refetchInterval: 30000,
  });

  const clinicas: ClinicaDTO[] = response?.items || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { ativo?: boolean; plano?: unknown } }) =>
      // @ts-expect-error Type matching complex API generated generic
      superAdminApi.updateClinica(id, data),
    onSuccess: (updatedClinica) => {
      queryClient.invalidateQueries({ queryKey: ['sa-clinicas-list'] });
      setSelectedClinica(updatedClinica);
      toast.success('Clínica atualizada com sucesso');
    },
    onError: () => {
      toast.error('Ocorreu um erro ao atualizar os dados da clínica');
    },
  });


  return (
    <div className="p-6 lg:p-10 min-h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 mb-8 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Gestão de Clínicas</h1>
          <p className="text-sa-text-muted text-sm uppercase">Administração de registos, planos e acessos</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="relative group">
            <Search className="w-4 h-4 text-sa-text-muted absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-sa-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou identificador..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-sa-background border border-sa-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-sa-primary transition-colors min-w-[280px]"
            />
          </div>
          <button className="p-2.5 rounded-lg bg-sa-background border border-sa-border text-sa-text-muted hover:text-white hover:bg-white/5 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 bg-sa-background border border-sa-border rounded-2xl overflow-hidden flex flex-col relative z-0">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-sa-border bg-white/5 text-xs text-sa-text-muted uppercase tracking-wider font-semibold shrink-0">
          <div className="col-span-4">Nome da Clínica</div>
          <div className="col-span-2">Identificador</div>
          <div className="col-span-2">Plano Ativo</div>
          <div className="col-span-2 text-center">Consultas</div>
          <div className="col-span-2 text-right px-4">Estado</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-10 mt-10">
              <Loader2 className="w-8 h-8 animate-spin text-sa-primary opacity-50" />
            </div>
          ) : clinicas.length === 0 ? (
            <div className="p-10 text-center text-sm text-sa-text-muted uppercase tracking-widest opacity-40">
              Nenhuma clínica encontrada com os critérios atuais
            </div>
          ) : (
            clinicas.map((clinica) => (
              <div 
                key={clinica.id}
                onClick={() => setSelectedClinica(clinica)}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center group cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:border-sa-primary/50 group-hover:text-sa-primary transition-all">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white group-hover:text-sa-primary transition-colors truncate">{clinica.nome}</span>
                </div>
                
                <div className="col-span-2 font-mono text-xs text-sa-text-muted">
                  {clinica.slug}
                </div>
                
                <div className="col-span-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-sa-primary/5 text-sa-primary border border-sa-primary/20 font-medium uppercase tracking-tighter">
                    {clinica.plano || 'Nenhum'}
                  </span>
                </div>
                
                <div className="col-span-2 text-center text-sm text-sa-text-dim font-mono">
                  —
                </div>

                <div className="col-span-2 flex items-center justify-end gap-4 px-4">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 border border-white/5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      clinica.ativo ? 'bg-sa-primary shadow-[0_0_8px_rgba(var(--sa-primary),0.5)]' :
                      'bg-sa-destructive shadow-[0_0_8px_rgba(var(--sa-destructive),0.5)]'
                    }`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${clinica.ativo ? 'text-sa-primary' : 'text-sa-destructive'}`}>
                      {clinica.ativo ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                  
                  <button className="p-1 text-sa-text-muted hover:text-white transition-all transform hover:scale-110">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Context Panel (Drawer) */}
      <SlidePanel
        isOpen={!!selectedClinica}
        onClose={() => setSelectedClinica(null)}
        title={selectedClinica?.nome || ''}
        subtitle={`${selectedClinica?.slug} | ID: ${selectedClinica?.id?.substring(0, 8)}...`}
      >
        {selectedClinica && (
          <div className="space-y-8 animate-fade-in">
            {/* Status Card */}
            <div className="bg-sa-surface border border-white/5 rounded-xl p-6 flex items-start justify-between shadow-xl">
              <div>
                <p className="text-[10px] text-sa-text-muted uppercase font-bold tracking-widest mb-2">Estado Atual</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedClinica.ativo ? 'bg-sa-primary' : 'bg-sa-destructive'}`} />
                  <span className="font-semibold text-lg text-white">{selectedClinica.ativo ? 'Conta Ativa' : 'Acesso Suspenso'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-sa-text-muted uppercase font-bold tracking-widest mb-2">Plano de Subscrição</p>
                <span className="font-semibold text-lg text-sa-primary uppercase">{selectedClinica.plano || 'Nenhum'}</span>
              </div>
            </div>

            {/* Ações de Gestão */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 border-b border-sa-border pb-3">
                <ShieldAlert className="w-4 h-4 text-sa-destructive" /> Controlo de Acesso
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => updateMutation.mutate({ id: selectedClinica.id, data: { ativo: !selectedClinica.ativo } })}
                  disabled={updateMutation.isPending}
                  className={`w-full flex justify-between items-center p-5 rounded-xl border transition-all group disabled:opacity-50 ${
                    selectedClinica.ativo 
                      ? 'bg-sa-destructive/5 border-sa-destructive/20 hover:bg-sa-destructive/10' 
                      : 'bg-sa-primary/5 border-sa-primary/20 hover:bg-sa-primary/10'
                  }`}
                 >
                  <div className="text-left">
                    <p className={`font-bold text-base transition-colors ${selectedClinica.ativo ? 'text-sa-destructive' : 'text-sa-primary'}`}>
                      {selectedClinica.ativo ? 'Suspender Acesso da Clínica' : 'Reativar Acesso da Clínica'}
                    </p>
                    <p className="text-xs mt-1 text-sa-text-muted max-w-[240px]">
                      {selectedClinica.ativo 
                        ? 'Isto irá bloquear todos os logins, agendamentos e chamadas à API para esta clínica imediatamente.' 
                        : 'Isto irá restaurar todas as funcionalidades e acessos da clínica ao sistema.'}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${selectedClinica.ativo ? 'bg-sa-destructive/10 text-sa-destructive' : 'bg-sa-primary/10 text-sa-primary'}`}>
                    {selectedClinica.ativo ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>

    </div>
  );
}
