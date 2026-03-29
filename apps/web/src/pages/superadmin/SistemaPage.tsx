import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle,
  Settings,
  Check,
  X,
  Zap,
  Globe,
  Brain,
  Wrench
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '../../api/superadmin';
import toast from 'react-hot-toast';

interface FeatureFlag {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

const FLAG_ICONS: Record<string, React.ElementType> = {
  REGISTO_PUBLICO: Globe,
  PAGAMENTOS_STRIPE: Zap,
  IA_CONSULTA: Brain,
  MODO_MANUTENCAO: Wrench,
};

export function SistemaPage() {
  const queryClient = useQueryClient();
  const { data: flags, isLoading } = useQuery({
    queryKey: ['sa-feature-flags'],
    queryFn: () => superAdminApi.getFeatureFlags(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ codigo, ativo }: { codigo: string; ativo: boolean }) =>
      superAdminApi.updateFeatureFlag(codigo, ativo),
    onSuccess: () => {
      toast.success('Flag atualizada com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['sa-feature-flags'] });
    },
    onError: () => toast.error('Erro ao atualizar flag.'),
  });

  return (
    <div className="p-6 lg:p-10 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Sistema</h1>
        <p className="text-sa-text-muted text-sm uppercase tracking-widest">Configuração Global e Feature Flags</p>
      </div>

      <div className="grid grid-cols-12 gap-8">

        {/* Feature Flags */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] flex items-center gap-3">
            <Settings className="w-4 h-4 text-sa-primary" /> Feature Flags da Plataforma
          </h3>

          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-sa-background/40 border border-sa-border rounded-2xl animate-pulse" />
              ))
            ) : (
              flags?.map((flag: FeatureFlag) => {
                const Icon = FLAG_ICONS[flag.id] || Settings;
                const isCritical = flag.id === 'MODO_MANUTENCAO';
                
                return (
                  <div 
                    key={flag.id} 
                    className={`p-6 rounded-2xl border transition-all flex items-center justify-between gap-6 group ${
                      isCritical 
                        ? 'bg-sa-destructive/5 border-sa-destructive/20 hover:border-sa-destructive/40' 
                        : 'bg-sa-background/40 border-sa-border hover:border-sa-primary/20'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-3 rounded-xl ${isCritical ? 'bg-sa-destructive/10 text-sa-destructive' : 'bg-sa-primary/5 text-sa-primary'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">{flag.nome}</h4>
                        <p className="text-[11px] text-sa-text-muted mt-0.5 max-w-[400px]">{flag.descricao}</p>
                        {isCritical && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <AlertTriangle className="w-3 h-3 text-sa-destructive" />
                            <span className="text-[9px] text-sa-destructive font-bold uppercase tracking-widest">Acção crítica — afecta todos os tenants</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMutation.mutate({ codigo: flag.id, ativo: !flag.ativo })}
                      disabled={toggleMutation.isPending}
                      className={`relative w-14 h-7 rounded-full transition-all flex-shrink-0 ${
                        flag.ativo 
                          ? isCritical ? 'bg-sa-destructive' : 'bg-sa-primary' 
                          : 'bg-white/10'
                      }`}
                    >
                      <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${flag.ativo ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Health Alert */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-sa-primary" /> Estado de Conformidade
          </h3>

          <div className="bg-[#050505] border border-sa-border rounded-3xl p-8 space-y-6">
            {[
              { label: 'RGPD / Lei Protecção de Dados AO', ok: true },
              { label: 'Certificação SSL/TLS ativa', ok: true },
              { label: 'Backups automáticos (diários)', ok: true },
              { label: 'Logs de acesso 90 dias', ok: true },
              { label: 'IP Allowlist SuperAdmin', ok: false },
              { label: 'Audit Trail completo', ok: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[11px] text-sa-text-muted">{item.label}</span>
                <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider ${item.ok ? 'text-sa-primary' : 'text-sa-destructive'}`}>
                  {item.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {item.ok ? 'OK' : 'Pendente'}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-sa-primary/5 border border-sa-primary/20 rounded-2xl p-6 space-y-3">
            <p className="text-[10px] text-sa-text-dim uppercase font-bold tracking-[3px]">Score de Conformidade</p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-mono text-sa-primary font-bold">83</span>
              <span className="text-sa-text-muted text-sm mb-1.5">/ 100</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-[83%] bg-sa-primary rounded-full" style={{ boxShadow: '0 0 12px rgba(20,184,166,0.4)' }} />
            </div>
            <p className="text-[9px] text-sa-text-muted italic">IP Allowlist pendente reduz score em 17 pontos</p>
          </div>
        </div>

      </div>
    </div>
  );
}
