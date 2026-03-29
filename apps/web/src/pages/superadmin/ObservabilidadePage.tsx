import React from 'react';
import { 
  Activity, 
  Server, 
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { useHealthScores, useInfraStatus } from '../../hooks/useSuperAdmin';
import { Link } from 'react-router-dom';

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

export function ObservabilidadePage() {
  const { data: healthScores, isLoading: loadingHealth, refetch: refetchHealth } = useHealthScores();
  const { data: infra, isLoading: loadingInfra, refetch: refetchInfra } = useInfraStatus();

  const handleRefresh = () => {
    refetchHealth();
    refetchInfra();
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
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingHealth || loadingInfra) ? 'animate-spin' : ''}`} />
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

        {/* System Events Ticker */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           <h3 className="text-[10px] font-bold text-white uppercase tracking-[4px] flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-sa-text-muted" /> Live Incident Feed
           </h3>

           <div className="bg-[#050505] border border-sa-border rounded-3xl overflow-hidden flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
                 {[
                   { type: 'ERROR', msg: 'Falha crítica no webhook gateway', time: '2m ago', clinic: 'Clinica Central' },
                   { type: 'WARN', msg: 'Latência p99 acima de 500ms', time: '12m ago', clinic: 'Viana Health' },
                   { type: 'INFO', msg: 'Backup concluído com sucesso', time: '1h ago', clinic: 'System' },
                   { type: 'WARN', msg: 'Tentativa de brute-force detectada', time: '3h ago', clinic: 'Talatona Med' },
                    { type: 'ERROR', msg: 'Erro 502 Bad Gateway no Worker', time: '5h ago', clinic: 'System' }
                 ].map((ev, i) => (
                   <div key={i} className="p-5 hover:bg-white/[0.02] transition-colors space-y-2">
                      <div className="flex justify-between items-center">
                         <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                           ev.type === 'ERROR' ? 'bg-sa-destructive/20 text-sa-destructive' :
                           ev.type === 'WARN' ? 'bg-sa-warning/20 text-sa-warning' :
                           'bg-sa-primary/20 text-sa-primary'
                         } uppercase tracking-widest`}>
                           {ev.type}
                         </span>
                         <span className="text-[9px] text-sa-text-dim font-mono">{ev.time}</span>
                      </div>
                      <p className="text-xs text-white/90 font-medium leading-relaxed">{ev.msg}</p>
                      <p className="text-[9px] text-sa-text-dim uppercase tracking-wider">{ev.clinic}</p>
                   </div>
                 ))}
              </div>
              <div className="p-4 border-t border-sa-border bg-white/5 text-center">
                 <button className="text-[10px] font-bold text-sa-primary uppercase tracking-widest hover:underline">Ver Todos os Logs</button>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}
