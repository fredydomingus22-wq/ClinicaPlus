import React from 'react';
import { 
  Activity, 
  Server, 
  RefreshCw,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { useHealthScores, useInfraStatus, useSystemLogs } from '../../hooks/useSuperAdmin';
import { Link } from 'react-router-dom';
import { SystemLogDTO } from '../../api/superadmin';

interface HealthScore {
  clinicaId: string;
  nome: string;
  score: string;
  erros24h: number;
}

interface InfraService {
  name: string;
  status: string;
  latency: string;
  uptime: string;
}

const NIVEL_META: Record<string, { label: string; color: string }> = {
  ERROR: { label: 'ERROR', color: 'bg-sa-destructive/20 text-sa-destructive' },
  WARN:  { label: 'WARN',  color: 'bg-sa-warning/20 text-sa-warning' },
  INFO:  { label: 'INFO',  color: 'bg-sa-primary/20 text-sa-primary' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export function ObservabilidadePage() {
  const { data: healthScores, isLoading: loadingHealth, refetch: refetchHealth } = useHealthScores();
  const { data: infra, isLoading: loadingInfra, refetch: refetchInfra } = useInfraStatus();
  const { data: logsData, isLoading: loadingLogs, refetch: refetchLogs } = useSystemLogs({ limit: 20 });

  const handleRefresh = (): void => {
    refetchHealth();
    refetchInfra();
    refetchLogs();
  };

  return (
    <div className="p-6 lg:p-10 space-y-10 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Observabilidade</h1>
          <p className="text-sa-text-muted text-sm uppercase">Monitorização de saúde e telemetria da infraestrutura</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className="p-2.5 rounded-lg bg-sa-background border border-sa-border text-sa-text-muted hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingHealth || loadingInfra || loadingLogs) ? 'animate-spin' : ''}`} />
            Actualizar Agora
          </button>
        </div>
      </div>

      {/* Infrastructure Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {loadingInfra ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-sa-background/40 border border-sa-border rounded-2xl animate-pulse" />
          ))
        ) : (
          infra?.services.map((service: InfraService, i: number) => (
            <div key={i} className="bg-sa-background/40 border border-sa-border p-5 rounded-2xl space-y-4 hover:border-sa-primary transition-colors group">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${service.status === 'OPERATIONAL' ? 'bg-sa-primary/5 text-sa-primary' : 'bg-sa-destructive/5 text-sa-destructive'} transition-colors group-hover:bg-sa-primary group-hover:text-sa-background`}>
                  <Server className="w-4 h-4" />
                </div>
                <div className={`w-2 h-2 rounded-full ${service.status === 'OPERATIONAL' ? 'bg-sa-primary shadow-[0_0_8px_rgba(20,184,166,0.6)]' : 'bg-sa-destructive shadow-[0_0_8px_rgba(225,29,72,0.6)]'}`} />
              </div>
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider">{service.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-[10px] text-sa-text-dim font-mono">{service.latency}</span>
                   <span className="text-[10px] text-sa-text-dim font-mono">{service.uptime} Uptime</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Health Map (Grid of Clinics) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] flex items-center gap-3">
                 <Activity className="w-4 h-4 text-sa-primary" /> Health Map (Real-time)
              </h3>
              <div className="flex items-center gap-4 text-[9px] font-bold text-sa-text-dim uppercase tracking-widest">
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sa-primary" /> Saudável</div>
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sa-warning" /> Atenção</div>
                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-sa-destructive" /> Crítico</div>
              </div>
           </div>

           <div className="bg-[#050505] border border-sa-border rounded-3xl p-8 min-h-[400px]">
              {loadingHealth ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-30">
                   <RefreshCw className="w-8 h-8 animate-spin" />
                   <span className="text-xs uppercase tracking-[3px]">A ler sinais térmicos...</span>
                </div>
              ) : ( healthScores?.length === 0 ? (
                <div className="p-20 text-center opacity-30 italic">Nenhuma clínica activa detectada</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {(healthScores as HealthScore[] | undefined)?.map((score: HealthScore) => (
                    <Link 
                      key={score.clinicaId}
                      to={`/superadmin/clinicas/${score.clinicaId}`}
                      className={`aspect-square rounded-2xl border p-4 flex flex-col justify-between transition-all hover:scale-105 hover:z-10 group relative ${
                        score.score === 'VERDE' ? 'bg-sa-primary/5 border-sa-primary/10 hover:border-sa-primary' :
                        score.score === 'AMARELO' ? 'bg-sa-warning/5 border-sa-warning/10 hover:border-sa-warning' :
                        'bg-sa-destructive/5 border-sa-destructive/10 hover:border-sa-destructive'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                         <div className={`w-2 h-2 rounded-full ${
                            score.score === 'VERDE' ? 'bg-sa-primary' :
                            score.score === 'AMARELO' ? 'bg-sa-warning' :
                            'bg-sa-destructive'
                         }`} />
                         <ArrowUpRight className="w-3 h-3 text-sa-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] text-white font-bold uppercase truncate leading-tight">{score.nome}</p>
                         <p className="text-[9px] text-sa-text-dim mt-1 font-mono tracking-tighter">
                            {score.erros24h} erros/24h
                         </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
           </div>
        </div>

        {/* Live Incident Feed — dados reais dos logs do sistema */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-sa-text-muted" /> Live Incident Feed
           </h3>

           <div className="bg-[#050505] border border-sa-border rounded-3xl overflow-hidden flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
                {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-30">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs uppercase tracking-[3px]">A carregar eventos...</span>
                  </div>
                ) : logsData?.items.length === 0 ? (
                  <div className="p-10 text-center opacity-30 italic text-sm">Sem eventos recentes</div>
                ) : (
                  logsData?.items.map((log: SystemLogDTO) => {
                    const meta = NIVEL_META[log.nivel] ?? { label: log.nivel, color: 'bg-white/10 text-white' };
                    return (
                      <div key={log.id} className="p-5 hover:bg-white/[0.02] transition-colors space-y-2">
                         <div className="flex justify-between items-center">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${meta.color} uppercase tracking-widest`}>
                              {meta.label}
                            </span>
                            <span className="text-[9px] text-sa-text-dim font-mono">{timeAgo(log.criadoEm)}</span>
                         </div>
                         <p className="text-xs text-white/90 font-medium leading-relaxed">{log.mensagem}</p>
                         <p className="text-[9px] text-sa-text-dim uppercase tracking-wider">{log.utilizadorNome || log.acao || 'System'}</p>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-sa-border bg-white/5 text-center">
                 <Link to="/superadmin/logs" className="text-[10px] font-bold text-sa-primary uppercase tracking-widest hover:underline">
                   Ver Todos os Logs
                 </Link>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}
