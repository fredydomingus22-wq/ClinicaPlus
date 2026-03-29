import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Activity, 
  ShieldCheck, 
  MessageSquare,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  Smartphone,
  Mail,
  MapPin
} from 'lucide-react';
import { useSuperAdminClinica, useUpdateClinica, useImpersonar } from '../../hooks/useSuperAdmin';
import { formatKwanza } from '@clinicaplus/utils';
import { Badge } from '@clinicaplus/ui';

type TabType = 'visao-geral' | 'utilizadores' | 'financeiro' | 'observabilidade' | 'auditoria' | 'suporte';

export function ClinicaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('visao-geral');
  
  const { data: clinica, isLoading, error } = useSuperAdminClinica(id!);
  const updateMutation = useUpdateClinica();
  const impersonarMutation = useImpersonar();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-sa-primary opacity-40" />
        <p className="text-xs text-sa-text-dim uppercase tracking-[3px]">A aceder à unidade central...</p>
      </div>
    );
  }

  if (error || !clinica) {
    return (
      <div className="p-10 text-center">
        <p className="text-sa-destructive">Erro ao carregar detalhes da clínica.</p>
        <Link to="/superadmin/clinicas" className="text-sa-primary mt-4 inline-block underline">Voltar para a lista</Link>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: Building2 },
    { id: 'utilizadores', label: 'Utilizadores', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
    { id: 'observabilidade', label: 'Observabilidade', icon: Activity },
    { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck },
    { id: 'suporte', label: 'Suporte', icon: MessageSquare },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in">
      
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
        <div className="space-y-4">
          <Link to="/superadmin/clinicas" className="flex items-center gap-2 text-sa-text-dim hover:text-white transition-colors group text-xs uppercase font-bold tracking-widest">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Voltar à Rede
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-display font-medium tracking-tight text-white">{clinica.nome}</h1>
              <Badge variant={clinica.ativo ? 'success' : 'error'} className="uppercase tracking-widest text-[10px]">
                {clinica.ativo ? 'Ativo' : 'Suspenso'}
              </Badge>
            </div>
            <p className="text-sa-text-muted text-sm font-mono uppercase tracking-wider">{clinica.slug} • {clinica.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => impersonarMutation.mutate({ clinicaId: clinica.id, adminId: 'root', motivo: 'Suporte Técnico via SuperAdmin' })}
             disabled={impersonarMutation.isPending}
             className="px-6 py-2.5 bg-white text-black font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-sa-primary hover:text-white transition-all shadow-xl flex items-center gap-2"
           >
             {impersonarMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Smartphone className="w-3 h-3" />}
             Acesso Remoto
           </button>
           <button 
             onClick={() => updateMutation.mutate({ id: clinica.id, data: { ativo: !clinica.ativo } })}
             disabled={updateMutation.isPending}
             className={`px-6 py-2.5 border font-bold rounded-lg text-xs uppercase tracking-widest transition-all ${
               clinica.ativo 
                 ? 'border-sa-destructive/50 text-sa-destructive hover:bg-sa-destructive/10' 
                 : 'border-sa-primary/50 text-sa-primary hover:bg-sa-primary/10'
             }`}
           >
             {clinica.ativo ? 'Suspender' : 'Activar'}
           </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-sa-border overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-8 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] transition-all relative ${
                activeTab === tab.id ? 'text-sa-primary' : 'text-sa-text-dim hover:text-white'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sa-primary shadow-[0_-2px_10px_rgba(20,184,166,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column (Main Content) */}
        <div className="col-span-12 lg:col-span-8 space-y-8 min-h-[500px]">
          
          {activeTab === 'visao-geral' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'Utilizadores', val: '0', icon: Users, color: 'text-sa-primary' },
                   { label: 'Pacientes', val: '0', icon: ShieldCheck, color: 'text-blue-400' },
                   { label: 'Consultas', val: '0', icon: Activity, color: 'text-amber-400' }
                 ].map((s, i) => (
                   <div key={i} className="bg-sa-background/40 border border-sa-border p-5 rounded-2xl flex flex-col gap-1">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[10px] text-sa-text-muted font-bold uppercase tracking-widest">{s.label}</span>
                         <s.icon className={`w-4 h-4 ${s.color} opacity-40`} />
                      </div>
                      <span className="text-2xl font-mono text-white font-medium">{s.val}</span>
                   </div>
                 ))}
              </div>

              {/* Info Table */}
              <div className="bg-[#050505] border border-sa-border rounded-2xl overflow-hidden">
                 <div className="px-6 py-4 border-b border-sa-border bg-white/5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Informações de Registo</h3>
                 </div>
                 <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-12">
                     {[
                       { label: 'Nome Legal', val: clinica.nome, icon: Building2 },
                       { label: 'Email Central', val: clinica.email, icon: Mail },
                       { label: 'Telefone', val: clinica.telefone || 'Não fornecido', icon: Smartphone },
                       { label: 'Data de Fundação', val: new Date(clinica.criadoEm).toLocaleDateString('pt-AO'), icon: Calendar },
                       { label: 'Última Actividade', val: 'Indisponível', icon: Clock },
                       { label: 'Sede/Localização', val: 'Luanda, Angola', icon: MapPin }
                     ].map((item, i) => (
                       <div key={i} className="space-y-1">
                          <p className="text-[9px] text-sa-text-dim uppercase font-bold tracking-[2px] flex items-center gap-2">
                             <item.icon className="w-3 h-3 opacity-30" /> {item.label}
                          </p>
                          <p className="text-sm text-white/90 font-medium">{item.val}</p>
                       </div>
                     ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'utilizadores' && (
             <div className="bg-[#050505] border border-sa-border rounded-2xl p-20 text-center space-y-4 animate-in fade-in">
                <Users className="w-12 h-12 text-sa-primary opacity-20 mx-auto" />
                <p className="text-sm text-sa-text-muted italic">Módulo de utilizadores em fase de conexão...</p>
             </div>
          )}

          {activeTab === 'financeiro' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="bg-sa-background border border-sa-border p-8 rounded-2xl flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-sa-text-dim uppercase font-bold tracking-[3px] mb-2">Plano Vigente</p>
                      <h4 className="text-3xl font-display text-sa-primary tracking-tighter uppercase">{clinica.plano}</h4>
                      <p className="text-xs text-sa-text-muted mt-1">Cobrança mensal activa</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-sa-text-dim uppercase font-bold tracking-[3px] mb-2">Valor Base</p>
                      <h4 className="text-3xl font-mono text-white tracking-widest">{formatKwanza(clinica.plano === 'PRO' ? 7500000 : clinica.plano === 'ENTERPRISE' ? 20000000 : 2500000)}</h4>
                   </div>
                </div>
                <div className="bg-[#050505] border border-sa-border rounded-2xl p-20 text-center">
                   <CreditCard className="w-12 h-12 text-sa-text-dim opacity-10 mx-auto" />
                </div>
             </div>
          )}

          {activeTab === 'observabilidade' && (
             <div className="bg-[#050505] border border-sa-border rounded-2xl p-20 text-center space-y-4 animate-in fade-in">
                <Activity className="w-12 h-12 text-blue-400 opacity-20 mx-auto" />
                <p className="text-sm text-sa-text-muted italic">A ler fluxo de dados operacionais da clínica...</p>
             </div>
          )}

          {activeTab === 'auditoria' && (
             <div className="bg-[#050505] border border-sa-border rounded-2xl p-20 text-center space-y-4 animate-in fade-in">
                <ShieldCheck className="w-12 h-12 text-emerald-400 opacity-20 mx-auto" />
                <p className="text-sm text-sa-text-muted italic">Módulo de rastreabilidade forense em carregamento...</p>
             </div>
          )}

          {activeTab === 'suporte' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="bg-sa-destructive/5 border border-sa-destructive/20 p-8 rounded-2xl space-y-4">
                   <div className="flex items-center gap-3 text-sa-destructive">
                      <ShieldAlert className="w-6 h-6" />
                      <h3 className="font-bold text-lg uppercase tracking-widest">Acesso de Alta Segurança</h3>
                   </div>
                   <p className="text-sm text-sa-text-muted max-w-[500px]">
                      Como Super-Administrador, pode impersonar qualquer administrador desta clínica. Todas as acções serão logadas como <span className="text-white font-bold underline">ACTO DE IMPERSONATION</span>.
                   </p>
                   <button 
                     onClick={() => impersonarMutation.mutate({ clinicaId: clinica.id, adminId: 'root', motivo: 'Suporte Técnico Direto' })}
                     className="bg-sa-destructive text-white font-bold px-8 py-3 rounded-xl text-xs uppercase tracking-widest transition-all hover:-translate-y-1"
                   >
                     Iniciar Sessão Remota (Failsafe)
                   </button>
                </div>
             </div>
          )}
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           
           <div className="bg-sa-background/40 border border-sa-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-sa-primary/10 border border-sa-primary/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-sa-primary" />
                 </div>
                 <div>
                    <h4 className="text-white font-bold leading-tight uppercase tracking-widest text-xs">Identidade Digital</h4>
                    <p className="text-[10px] text-sa-text-dim font-mono">{clinica.slug}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[10px] border-b border-sa-border pb-3">
                    <span className="text-sa-text-dim uppercase font-bold tracking-widest">Plano Ativo</span>
                    <span className="text-white font-mono">{clinica.plano}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] border-b border-sa-border pb-3">
                    <span className="text-sa-text-dim uppercase font-bold tracking-widest">Estado</span>
                    <span className={clinica.ativo ? 'text-sa-primary' : 'text-sa-destructive'}>{clinica.ativo ? 'OPERACIONAL' : 'SUSPENSO'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] border-b border-sa-border pb-3">
                    <span className="text-sa-text-dim uppercase font-bold tracking-widest">Membros</span>
                    <span className="text-white font-mono">0 / 20</span>
                 </div>
              </div>

              <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-sa-text-muted hover:text-white hover:border-sa-primary transition-all flex items-center justify-center gap-2 group">
                 Ver App da Clínica <ExternalLink className="w-3 h-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
           </div>

           <div className="bg-[#050505] border border-sa-border rounded-2xl p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sa-primary/5 blur-3xl -mr-10 -mt-10" />
              
              <div className="flex items-center gap-2 mb-2">
                 <Activity className="w-4 h-4 text-sa-primary" />
                 <h4 className="text-[10px] font-bold text-white uppercase tracking-[3px]">Saúde do Sistema</h4>
              </div>

              <div className="space-y-4 relative">
                 {[
                   { name: 'API Latency', perf: '45ms' },
                   { name: 'DB Connection', perf: '0ms' },
                   { name: 'Webhook Gateway', perf: '99%' }
                 ].map((h, i) => (
                   <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                         <span className="text-sa-text-dim font-bold uppercase">{h.name}</span>
                         <span className="text-white font-mono">{h.perf}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-sa-primary w-full shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
