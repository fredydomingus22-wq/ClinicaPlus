import React, { useState } from 'react';
import { 
  Smartphone,
  ShieldAlert,
  History,
  Loader2,
  Search,
  AlertTriangle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { superAdminApi } from '../../api/superadmin';
import { useSuperAdminClinicas, useImpersonar } from '../../hooks/useSuperAdmin';
import toast from 'react-hot-toast';

type ClinicaItem = { id: string; nome: string; plano: string; ativo: boolean };
type ImpersonationRecord = { id: string; clinicaNome: string; superAdminNome: string; motivo: string; criadoEm: string; ativo: boolean };

export function SuportePage() {
  const [selectedClinicaId, setSelectedClinicaId] = useState('');
  const [selectedClinicaNome, setSelectedClinicaNome] = useState('');
  const [motivo, setMotivo] = useState('');
  const [searchClinica, setSearchClinica] = useState('');

  const { data: clinicas } = useSuperAdminClinicas({ limit: 20 });
  const impersonarMutation = useImpersonar();

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['sa-impersonation-history'],
    queryFn: () => superAdminApi.getImpersonationHistory(),
    staleTime: 30 * 1000,
  });

  const handleImpersonar = () => {
    if (!selectedClinicaId) { toast.error('Seleccione uma clínica primeiro.'); return; }
    if (motivo.trim().length < 10) { toast.error('O motivo deve ter pelo menos 10 caracteres.'); return; }
    impersonarMutation.mutate({ clinicaId: selectedClinicaId, adminId: 'root', motivo });
  };

  const filteredClinicas = (clinicas?.items ?? []).filter(
    (c: ClinicaItem) => !searchClinica || c.nome.toLowerCase().includes(searchClinica.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Suporte Avançado</h1>
        <p className="text-sa-text-muted text-sm uppercase tracking-widest">Acesso remoto, impersonation e histórico de sessões</p>
      </div>

      <div className="grid grid-cols-12 gap-8">

        {/* Impersonation Panel */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-sa-destructive/5 border border-sa-destructive/20 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 text-sa-destructive">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-sm uppercase tracking-[2px]">Iniciar Sessão Remota</h3>
            </div>

            <p className="text-[11px] text-sa-text-muted leading-relaxed">
              Acesse uma clínica com privilégios administrativos. Todas as acções serão registadas no audit log com o seu nome e o motivo declarado. Esta operação não é anónima.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-sa-text-dim uppercase tracking-[3px] mb-2">Clínica Alvo</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sa-text-dim" />
                  <input
                    type="text"
                    placeholder="Pesquisar clínica..."
                    value={searchClinica}
                    onChange={e => setSearchClinica(e.target.value)}
                    className="w-full bg-sa-background border border-sa-border rounded-xl pl-9 pr-4 py-3 text-xs text-white placeholder-sa-text-dim focus:outline-none focus:border-sa-primary transition-colors"
                  />
                </div>

                {searchClinica && filteredClinicas.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-[180px] overflow-y-auto bg-[#050505] border border-sa-border rounded-xl p-2">
                    {filteredClinicas.map((c: ClinicaItem) => (
                      <button
                        key={c.id}
                        onClick={() => { 
                          setSelectedClinicaId(c.id); 
                          setSelectedClinicaNome(c.nome);
                          setSearchClinica(''); 
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-3 ${
                          selectedClinicaId === c.id 
                            ? 'bg-sa-primary/10 text-sa-primary' 
                            : 'text-sa-text-muted hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.ativo ? 'bg-sa-primary' : 'bg-sa-destructive'}`} />
                        {c.nome}
                        <span className="ml-auto font-mono text-[8px] opacity-50">{c.plano}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedClinicaId && (
                  <div className="mt-2 px-4 py-2.5 bg-sa-primary/10 border border-sa-primary/30 rounded-xl text-[10px] text-sa-primary font-bold uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sa-primary" />
                    {selectedClinicaNome}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-sa-text-dim uppercase tracking-[3px] mb-2">Motivo (obrigatório)</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ex: Cliente reportou problema X. Acesso para investigação e resolução."
                  className="w-full bg-sa-background border border-sa-border rounded-xl px-4 py-3 text-xs text-white placeholder-sa-text-dim focus:outline-none focus:border-sa-primary transition-colors resize-none"
                />
                <p className="text-[9px] text-sa-text-dim mt-1">{motivo.length}/200 · mínimo 10 caracteres</p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-sa-destructive/10 rounded-xl border border-sa-destructive/20">
                <AlertTriangle className="w-3.5 h-3.5 text-sa-destructive flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-sa-destructive leading-relaxed">
                  A sessão expira automaticamente em <strong>30 minutos</strong>. Não partilhe o token gerado.
                </p>
              </div>

              <button
                onClick={handleImpersonar}
                disabled={impersonarMutation.isPending || !selectedClinicaId || motivo.trim().length < 10}
                className="w-full py-3.5 bg-sa-destructive text-white font-bold text-xs uppercase tracking-[3px] rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(225,29,72,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {impersonarMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> A gerar token...</>
                ) : (
                  <><Smartphone className="w-3.5 h-3.5" /> Iniciar Sessão Remota</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Impersonation History */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] flex items-center gap-3">
            <History className="w-4 h-4 text-sa-text-muted" /> Histórico de Acessos Remotos
          </h3>

          <div className="bg-[#050505] border border-sa-border rounded-3xl overflow-hidden">
            {loadingHistory ? (
              <div className="p-20 flex flex-col items-center gap-4 opacity-30">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs uppercase tracking-[3px]">A carregar histórico forense...</span>
              </div>
            ) : !(history as ImpersonationRecord[])?.length ? (
              <div className="p-20 text-center text-sa-text-muted text-sm italic opacity-40">
                Nenhum acesso remoto registado.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {(history as ImpersonationRecord[]).map((session) => (
                  <div key={session.id} className="p-6 hover:bg-white/[0.01] transition-colors space-y-3 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white font-bold uppercase tracking-wide">{session.clinicaNome}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${
                            session.ativo ? 'bg-sa-primary/20 text-sa-primary' : 'bg-white/10 text-sa-text-dim'
                          }`}>
                            {session.ativo ? 'Activa' : 'Expirada'}
                          </span>
                        </div>
                        <p className="text-[10px] text-sa-text-muted">{session.motivo}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[9px] text-sa-text-dim font-mono">{new Date(session.criadoEm).toLocaleString('pt-AO')}</p>
                        <p className="text-[9px] text-sa-text-dim mt-0.5">por {session.superAdminNome}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
