import React from 'react';
import { Zap, Plus, Smartphone, MessageSquare } from 'lucide-react';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { PlanGate } from '../../components/PlanGate';
import { WaConexaoCard } from '../../components/wa/WaConexaoCard';
import { WaAutomacaoCard } from '../../components/wa/WaAutomacaoCard';
import { WaActividadeRecente } from '../../components/wa/WaActividadeRecente';
import { Button, Card, Badge, EmptyState, KpiCard } from '@clinicaplus/ui';

/**
 * Página de Gestão de WhatsApp e Automações (Multi-Instância)
 */
export function WhatsappPage() {
  const { 
    instancias, 
    automacoes, 
    templates,
    actividade,
    metricas,
    isLoading, 
    criarInstancia, 
    eliminarInstancia, 
    actualizarAutomacao,
    adicionarAutomacao,
    criando,
    eliminando,
    toggling,
    adicionando,
    refetchQrCode
  } = useWhatsApp();

  // Mapeamos as métricas agregadas da API para os 4 KPIs requeridos
  const kpiMensagens = metricas?.totalMensagens || 0;
  const kpiMarcacoes = metricas?.totalAgendamentos || 0;
  const kpiConversas = metricas?.conversasActivas || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kpiTaxa = (metricas as any)?.taxaConfirmacao || '—';

  // Componente de Tooltip local (idealmente usaria de @clinicaplus/ui se existir, mas se não tentamos não criar dependências externas não planeadas)
  // Vamos deixar a implementação dos modais/tooltips onde eles pertencem, e focar no layout.

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in pb-10 px-4 sm:px-6">
      <PlanGate planoMinimo="PRO">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Gestão de WhatsApp</h1>
            <p className="text-neutral-500 mt-1">Gere múltiplos números e automações inteligentes para a sua clínica.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" className="px-4 py-1.5 text-xs font-bold ring-4 ring-success-50">
              Módulo Ativo
            </Badge>
            <Button 
              onClick={() => criarInstancia()} 
              loading={criando}
              className="font-bold shadow-sm"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Número
            </Button>
          </div>
        </div>

        {/* --- FILA DE KPI (4 colunas) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <KpiCard 
            label="MENSAGENS ENVIADAS" 
            value={kpiMensagens} 
            icon={MessageSquare}
            loading={isLoading}
            badgeText="Mensal"
          />
          <KpiCard 
            label="MARCAÇÕES VIA WA" 
            value={kpiMarcacoes} 
            icon={Zap}
            loading={isLoading}
            badgeText="Total"
            color="amber"
          />
          <KpiCard 
            label="CONVERSAS ACTIVAS" 
            value={kpiConversas} 
            icon={Smartphone}
            loading={isLoading}
            badgeText="Sessão"
            color="green"
          />
          <KpiCard 
            label="TAXA DE CONFIRMAÇÃO" 
            value={kpiTaxa} 
            icon={MessageSquare}
            loading={isLoading}
            badgeText="Mensal"
            color="blue"
          />
        </div>

        {/* --- SECÇÃO: NÚMEROS ACTIVOS --- */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Números Activos
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {instancias.length === 0 && !isLoading && (
              <EmptyState 
                icon={Smartphone}
                title="Nenhum número ligado"
                description="Liga um número WhatsApp para activar as automações."
                action={{
                  label: 'Conectar WhatsApp',
                  onClick: () => criarInstancia()
                }}
                className="col-span-full border-2 border-dashed border-neutral-100 py-16"
              />
            )}
            
            {instancias.map((inst) => (
              <WaConexaoCard 
                key={inst.id}
                instancia={inst}
                onConectar={(id) => refetchQrCode(id)} 
                onEliminar={(id) => eliminarInstancia(id)}
                isCreating={criando}
                isEliminating={eliminando}
              />
            ))}
          </div>
        </div>

        {/* --- SECÇÃO: AUTOMAÇÕES + ACTIVIDADE (Grid 3:2) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
          
          {/* Coluna Automações (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                Automações
              </h2>
            </div>
            
            <Card className="p-0 border-neutral-200/60 shadow-sm overflow-hidden flex flex-col">
              <div className="flex flex-col">
                {(Array.isArray(templates) ? templates : []).length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-neutral-500 uppercase tracking-widest">A carregar configurações...</div>
                ) : (
                  (Array.isArray(templates) ? templates : [])
                    .filter(tpl => ['MARCACAO_CONSULTA', 'LEMBRETE_24H', 'LEMBRETE_2H', 'CONFIRMACAO_CANCELAMENTO', 'BOAS_VINDAS'].includes(tpl.tipo))
                    .map((tpl, idx, arr) => {
                    const defaultInst = instancias.find((i) => i.estado === 'CONECTADO') || instancias[0];
                    const existingAuto = automacoes.find((a) => a.tipo === tpl.tipo && (defaultInst ? a.waInstanciaId === defaultInst.id : true));
                    
                    const automacaoObj = {
                      ...(existingAuto?.id ? { id: existingAuto.id } : {}),
                      tipo: tpl.tipo,
                      ativo: existingAuto ? existingAuto.ativo : false,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      configuracao: existingAuto?.configuracao || (tpl as any).configuracaoDefault || {}
                    };

                    return (
                      <WaAutomacaoCard 
                        key={tpl.id || tpl.tipo} 
                        automacao={automacaoObj}
                        isDisconnected={!defaultInst || defaultInst.estado !== 'CONECTADO'}
                        isToggling={toggling || adicionando}
                        hasSeparator={idx < arr.length - 1}
                        onToggle={(tipo, id, active) => {
                          if (id) {
                            actualizarAutomacao(id, active);
                          } else if (defaultInst && active) {
                            adicionarAutomacao(tipo, defaultInst.id);
                          }
                        }}
                      />
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Coluna Actividade (2/5) */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center gap-3">
               <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                 Actividade Recente
               </h2>
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-50 text-success-700 text-[9px] font-black uppercase tracking-widest border border-success-100">
                 <div className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                 LIVE
               </div>
             </div>
             
             <WaActividadeRecente actividade={actividade} />
          </div>
        </div>
      </PlanGate>
    </div>
  );
}
