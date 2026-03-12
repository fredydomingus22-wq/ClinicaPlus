import React, { useState } from 'react';
import { Building2, Users, Activity, CreditCard, ChevronRight, Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGlobalStats, useSystemLogs } from '../../hooks/useSuperAdmin';
import { ProvisionTenantModal } from './components/ProvisionTenantModal';
import { SystemBroadcastModal } from './components/SystemBroadcastModal';
import { formatKwanza } from '@clinicaplus/utils';
import { SystemLogDTO } from '@clinicaplus/types';

export function OverviewPage() {
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  const { data: stats, isLoading, isError } = useGlobalStats();
  const { data: logsData } = useSystemLogs({ limit: 5 });

  const kpis = [
    { title: 'Clínicas Registadas', value: stats?.totalClinicas?.toLocaleString('pt-AO') || '0', change: 'ATUALIZADO AGORA', icon: Building2 },
    { title: 'Pacientes na Rede', value: stats?.totalUtilizadores?.toLocaleString('pt-AO') || '0', change: 'ATUALIZADO AGORA', icon: Users },
    { title: 'Agendamentos de Hoje', value: stats?.totalAgendamentos?.toLocaleString('pt-AO') || '0', change: 'HOJE', icon: Activity },
    { 
      title: 'Faturação Prevista', 
      value: stats ? formatKwanza(stats.totalRevenue) : '-', 
      change: 'SUBSCRIÇÕES', 
      icon: CreditCard, 
      neon: true 
    },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-sa-primary opacity-50" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center">
        <div className="bg-sa-destructive/10 border border-sa-destructive text-sa-destructive p-8 rounded-2xl max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro ao carregar estatísticas</h2>
          <p className="text-sa-text-muted mb-6">Não foi possível obter os dados globais neste momento. Por favor, tente recarregar a página.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-sa-destructive text-white rounded-lg font-bold">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 min-h-full">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-sa-border pb-6 mb-10">
        <div>
          <h1 className="text-4xl font-display font-medium tracking-tight text-white mb-2">Visão Geral</h1>
          <p className="text-sa-text-muted text-sm uppercase">Administração Global e Centro de Operações</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-sa-background/40 border border-sa-border p-6 rounded-2xl relative overflow-hidden group hover:border-sa-primary/20 transition-colors">
            {kpi.neon && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-sa-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            )}
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors ${kpi.neon ? 'text-sa-primary' : 'text-sa-text-muted'}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-sa-text-muted uppercase tracking-wider mb-1 font-medium">{kpi.title}</p>
            <h3 className={`text-3xl font-display font-medium ${kpi.neon ? 'text-white' : 'text-white/90'}`}>
              {kpi.value}
            </h3>
            <p className={`font-mono text-[9px] mt-4 tracking-widest uppercase ${kpi.neon ? 'text-sa-primary' : 'text-sa-text-dim'}`}>
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      {/* Split lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Log */}
        <div className="lg:col-span-2 bg-sa-background/40 border border-sa-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-lg text-white">Atividade Recente do Sistema</h3>
            <Link to="/superadmin/logs" className="text-[10px] font-mono text-sa-primary hover:text-white flex items-center gap-1 transition-colors uppercase tracking-widest">
              VER HISTÓRICO COMPLETO <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {logsData?.items.map((log: SystemLogDTO) => (
              <div key={log.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0 group">
                <span className="font-mono text-[10px] text-white/20 shrink-0 mt-1">
                  {new Date(log.criadoEm).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`shrink-0 mt-1`}>
                  {log.nivel === 'ERRO' || log.nivel === 'CRITICO' ? <AlertTriangle className="w-3.5 h-3.5 text-sa-destructive" /> :
                   log.nivel === 'AVISO' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> :
                   log.acao === 'TENANT_PROVISIONING' ? <CheckCircle className="w-3.5 h-3.5 text-sa-primary" /> :
                   <Info className="w-3.5 h-3.5 text-blue-400" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-white/5 text-sa-text-muted rounded uppercase">
                      {log.acao?.replace(/_/g, ' ') || 'SISTEMA'}
                    </span>
                    <span className="text-[10px] text-sa-text-dim truncate">— {log.utilizadorNome}</span>
                  </div>
                  <p className="text-sm text-sa-text-muted group-hover:text-white/90 transition-colors">
                    {log.mensagem}
                  </p>
                </div>
              </div>
            ))}
            
            {!logsData?.items.length && (
              <div className="py-10 text-center">
                <p className="text-sa-text-muted text-sm uppercase opacity-50">Sem registos de atividade encontrados</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-sa-primary/5 border border-sa-primary/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
          
          <div className="relative z-10">
            <h3 className="font-display text-xl text-white mb-2">Painel de Operações</h3>
            <p className="text-sm text-sa-text-muted mb-8 leading-relaxed">Gerencie os principais aspetos da plataforma. As ações realizadas aqui podem afetar todas as clínicas registadas.</p>
          </div>
          
          <div className="relative z-10 flex flex-col gap-3">
            <button 
              onClick={() => setIsProvisionModalOpen(true)}
              className="w-full bg-sa-primary text-sa-background font-bold py-4 rounded-xl hover:bg-white hover:text-sa-background transition-all transform active:scale-[0.98] shadow-[0_0_25px_rgba(var(--sa-primary),0.2)] flex items-center justify-center gap-2 uppercase tracking-tight"
            >
              Registar Nova Clínica
            </button>
            <button 
              onClick={() => setIsBroadcastModalOpen(true)}
              className="w-full bg-white/5 border border-white/10 text-white font-medium py-3.5 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
            >
              Aviso Geral às Clínicas
            </button>
          </div>
        </div>

      </div>

      <ProvisionTenantModal 
        isOpen={isProvisionModalOpen} 
        onClose={() => setIsProvisionModalOpen(false)} 
      />

      <SystemBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
      />

    </div>
  );
}
