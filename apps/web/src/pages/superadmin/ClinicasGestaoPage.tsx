import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Building2, ShieldAlert, Loader2 } from 'lucide-react';
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
      toast.success('Tenant actualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar tenant');
    },
  });


  return (
    <div className="p-6 lg:p-10 min-h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 mb-8 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Tenant Control</h1>
          <p className="text-sa-text-muted font-mono text-sm uppercase">Manage clinics, plans and suspensions</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-sa-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tenant..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-sa-background border border-white/10 rounded-lg pl-9 pr-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-sa-primary transition-colors"
            />
          </div>
          <button className="p-2.5 rounded-lg bg-sa-background border border-white/10 text-sa-text-muted hover:text-white hover:bg-white/5 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 bg-sa-background border border-white/5 rounded-2xl overflow-hidden flex flex-col relative z-0">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-white/5 font-mono text-xs text-sa-text-muted uppercase tracking-wider shrink-0">
          <div className="col-span-4">Tenant Name</div>
          <div className="col-span-2">Slug</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Load (Appts)</div>
          <div className="col-span-2">Status</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-10 mt-10">
              <Loader2 className="w-8 h-8 animate-spin text-sa-primary opacity-50" />
            </div>
          ) : clinicas.length === 0 ? (
            <div className="p-10 text-center font-mono text-xs text-white/30 uppercase">
              NO TENANTS FOUND MATCHING CRITERIA
            </div>
          ) : (
            clinicas.map((clinica) => (
              <div 
                key={clinica.id}
                onClick={() => setSelectedClinica(clinica)}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center group cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:border-sa-primary/50 group-hover:text-sa-primary transition-colors">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white group-hover:text-sa-primary transition-colors">{clinica.nome}</span>
                </div>
                
                <div className="col-span-2 font-mono text-sm text-sa-text-muted">
                  {clinica.slug}
                </div>
                
                <div className="col-span-2">
                  <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
                    {clinica.plano || 'N/A'}
                  </span>
                </div>
                
                <div className="col-span-2 font-mono text-sm text-white/50">
                  {/* Aggregated query response later if needed, currently N/A */}
                  -
                </div>

                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      clinica.ativo ? 'bg-sa-primary shadow-sa-glow' :
                      'bg-sa-destructive shadow-[0_0_8px_rgba(var(--sa-destructive),0.5)]'
                    }`} />
                    <span className={`font-mono text-xs ${clinica.ativo ? 'text-white/70' : 'text-sa-destructive'}`}>{clinica.ativo ? 'ACTIVE' : 'SUSPENDED'}</span>
                  </div>
                  
                  <button className="opacity-0 group-hover:opacity-100 p-1 text-sa-text-muted hover:text-white transition-all">
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
        subtitle={`ID: ${selectedClinica?.id} | slug: ${selectedClinica?.slug}`}
      >
        {selectedClinica && (
          <div className="space-y-8 animate-fade-in">
            {/* Status Card */}
            <div className="bg-sa-background border border-white/10 rounded-xl p-5 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-sa-text-muted uppercase mb-1">Current Status</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selectedClinica.ativo ? 'bg-sa-primary' : 'bg-sa-destructive'}`} />
                  <span className="font-medium text-white">{selectedClinica.ativo ? 'ACTIVE' : 'SUSPENDED'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-sa-text-muted uppercase mb-1">Active Plan</p>
                <span className="font-medium text-white">{selectedClinica.plano || 'N/A'}</span>
              </div>
            </div>

            {/* Danger Zone */}
            <div>
              <h3 className="text-sm font-medium text-sa-destructive uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-sa-destructive/20 pb-2">
                <ShieldAlert className="w-4 h-4" /> Threat Control
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => updateMutation.mutate({ id: selectedClinica.id, data: { ativo: !selectedClinica.ativo } })}
                  disabled={updateMutation.isPending}
                  className="w-full flex justify-between items-center p-4 bg-sa-destructive/5 border border-sa-destructive/20 rounded-lg hover:bg-sa-destructive/10 transition-colors group disabled:opacity-50"
                 >
                  <div className="text-left">
                    <p className={`font-medium group-hover:brightness-125 ${selectedClinica.ativo ? 'text-sa-destructive' : 'text-sa-primary'}`}>
                      {selectedClinica.ativo ? 'Suspend Tenant' : 'Activate Tenant'}
                    </p>
                    <p className={`text-xs mt-0.5 ${selectedClinica.ativo ? 'text-sa-destructive/60' : 'text-sa-primary/60'}`}>
                      {selectedClinica.ativo ? 'Blocks all logins and API requests.' : 'Restores access immediately.'}
                    </p>
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
