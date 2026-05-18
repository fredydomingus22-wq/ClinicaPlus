import React, { useState, useEffect } from 'react';
import { Zap, Plus, Smartphone, MessageSquare } from 'lucide-react';
import { useWhatsApp } from '../../hooks/useWhatsApp';
import { PlanGate } from '../../components/PlanGate';
import { WaConexaoCard } from '../../components/wa/WaConexaoCard';
import { WaAutomacaoCard } from '../../components/wa/WaAutomacaoCard';
import { WaActividadeRecente } from '../../components/wa/WaActividadeRecente';
import { BotIntegracaoCard } from '../../components/wa/BotIntegracaoCard';
import { Button, Card, Badge, EmptyState, KpiCard, Select, Modal, Input } from '@clinicaplus/ui';
import { WaInstancia } from '../../api/whatsapp';

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
    configurarAutomacao,
    criando,
    criandoMeta,
    criarInstanciaMeta,
    eliminando,
    toggling,
    adicionando,
    configurando,
    refetchQrCode
  } = useWhatsApp();

  const [activeInstanciaId, setActiveInstanciaId] = useState<string>('');
  
  // Modais State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'SELECT' | 'EVOLUTION' | 'META'>('SELECT');
  const [metaForm, setMetaForm] = useState({ phoneNumberId: '', wabaId: '', accessToken: '' });

  const connectedInstancias = (instancias as WaInstancia[]).filter(i => i.estado === 'CONECTADO');

  // Inicializa a instância activa com a primeira disponível se não estiver definida
  useEffect(() => {
    if (!activeInstanciaId && connectedInstancias.length > 0) {
      setActiveInstanciaId(connectedInstancias[0]?.id || '');
    }
  }, [connectedInstancias, activeInstanciaId]);

  const selectedInstancia = connectedInstancias.find(i => i.id === activeInstanciaId) || connectedInstancias[0];

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
              onClick={() => {
                setAddType('SELECT');
                setMetaForm({ phoneNumberId: '', wabaId: '', accessToken: '' });
                setIsAddModalOpen(true);
              }} 
              loading={criando || criandoMeta}
              className="font-bold shadow-sm"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Número
            </Button>
          </div>
        </div>

        {/* Modal de Adição de Instância */}
        <Modal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          title="Nova Ligação WhatsApp"
          size={addType === 'SELECT' ? 'sm' : 'md'}
          footer={
            addType === 'META' ? (
              <>
                <Button variant="outline" onClick={() => setAddType('SELECT')}>Voltar</Button>
                <Button 
                  loading={criandoMeta}
                  disabled={!metaForm.phoneNumberId || !metaForm.wabaId || !metaForm.accessToken}
                  onClick={async () => {
                    await criarInstanciaMeta({
                      metaPhoneNumberId: metaForm.phoneNumberId,
                      metaWabaId: metaForm.wabaId,
                      metaAccessToken: metaForm.accessToken
                    });
                    setIsAddModalOpen(false);
                  }}
                >
                  Confirmar e Ligar
                </Button>
              </>
            ) : null
          }
        >
          {addType === 'SELECT' && (
            <div className="py-4 space-y-4">
              <p className="text-sm text-neutral-600 mb-6">Escolhe o tipo de integração que pretendes utilizar para este número.</p>
              
              <div 
                className="flex items-start p-4 border border-neutral-200 rounded-lg cursor-pointer hover:border-black hover:bg-neutral-50 transition-colors"
                onClick={async () => {
                  setIsAddModalOpen(false);
                  await criarInstancia();
                }}
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mr-4 shrink-0">
                  <Smartphone className="w-5 h-5 text-neutral-700" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900">Evolution API (QR Code)</h3>
                  <p className="text-xs text-neutral-500 mt-1">Conecta rapidamente com a app do WhatsApp através de QR Code. Ideal para testes e baixo volume.</p>
                </div>
              </div>

              <div 
                className="flex items-start p-4 border border-neutral-200 rounded-lg cursor-pointer hover:border-[#128C7E] hover:bg-[#128C7E]/5 transition-colors"
                onClick={() => setAddType('META')}
              >
                <div className="w-10 h-10 rounded-lg bg-[#128C7E]/10 flex items-center justify-center mr-4 shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#128C7E]" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900">Meta Cloud API (Oficial)</h3>
                  <p className="text-xs text-neutral-500 mt-1">Integração oficial, mais estável e com recursos nativos como listas e botões interativos.</p>
                </div>
              </div>
            </div>
          )}

          {addType === 'META' && (
            <div className="py-2 space-y-4">
              <p className="text-sm text-neutral-600 mb-4">Insere as credenciais fornecidas no painel <strong>Meta for Developers</strong> → App Dashboard.</p>
              
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Phone Number ID</label>
                <Input 
                  placeholder="Ex: 102345678901234" 
                  value={metaForm.phoneNumberId}
                  onChange={(e) => setMetaForm({ ...metaForm, phoneNumberId: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">WhatsApp Business Account ID</label>
                <Input 
                  placeholder="Ex: 102345678901235" 
                  value={metaForm.wabaId}
                  onChange={(e) => setMetaForm({ ...metaForm, wabaId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">System Access Token</label>
                <Input 
                  type="password"
                  placeholder="EAAB..." 
                  value={metaForm.accessToken}
                  onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })}
                />
              </div>
            </div>
          )}
        </Modal>

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
              
              <div className="mb-6">
                 <BotIntegracaoCard instancias={instancias} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                  Automações
                </h2>
                
                {connectedInstancias.length > 1 && (
                  <div className="w-full sm:w-64">
                    <Select 
                      options={connectedInstancias.map(i => ({ 
                        value: i.id, 
                        label: i.numeroTelefone || i.evolutionName 
                      }))}
                      value={activeInstanciaId}
                      onChange={(e) => setActiveInstanciaId(e.target.value)}
                      placeholder="Escolher Número"
                    />
                  </div>
                )}
              </div>
            
            <Card className="p-0 border-neutral-200/60 shadow-sm overflow-hidden flex flex-col">
              <div className="flex flex-col">
                {(Array.isArray(templates) ? templates : []).length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-neutral-500 uppercase tracking-widest">A carregar configurações...</div>
                ) : (
                  (Array.isArray(templates) ? templates : [])
                    .filter(tpl => ['IA_ASSISTANT', 'MARCACAO_CONSULTA', 'LEMBRETE_24H', 'LEMBRETE_2H', 'CONFIRMACAO_CANCELAMENTO', 'BOAS_VINDAS'].includes(tpl.tipo))
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
                        instancias={instancias}
                        isDisconnected={!selectedInstancia}
                        isToggling={toggling || adicionando}
                        isSaving={configurando}
                        hasSeparator={idx < arr.length - 1}
                        onToggle={(tipo, id, active) => {
                          if (id) {
                            actualizarAutomacao(id, active);
                          } else if (selectedInstancia && active) {
                            adicionarAutomacao(tipo, selectedInstancia.id);
                          }
                        }}
                        onSaveConfig={(id, config) => configurarAutomacao(id, config)}
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
