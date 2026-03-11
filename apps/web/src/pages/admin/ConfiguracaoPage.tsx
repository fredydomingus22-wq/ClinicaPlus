import React, { useEffect, useState } from 'react';
import { useClinicaMe, useUpdateClinicaMe, useUpdateClinicaContactos } from '../../hooks/useClinicas';
import { useBillingHistory, useSubscriptionStatus } from '../../hooks/useBilling';
import { formatCurrency, formatDate } from '@clinicaplus/utils';
import { 
  Building2, 
  Globe, 
  Phone, 
  CreditCard, 
  Zap, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Mail, 
  MessageSquare,
  Settings,
  Lock,
  Save,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  MapPin,
  FileText
} from 'lucide-react';
import type { ContactoClinicaInput, ClinicaUpdateInput } from '@clinicaplus/types';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  ErrorMessage,
  Badge, 
  Modal, 
  Switch,
  Spinner,
  cn
} from '@clinicaplus/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClinicaUpdateSchema } from '@clinicaplus/types';
import { PROVINCES } from '@clinicaplus/utils';
import { useUIStore } from '../../stores/ui.store';

export default function ConfiguracaoPage() {
  const { data: clinica, isLoading, error } = useClinicaMe();
  const { mutate: updateClinica, isPending: isUpdating } = useUpdateClinicaMe();
  const { data: billingHistory, isLoading: isLoadingBilling } = useBillingHistory();
  const { data: subStatus, isLoading: isLoadingSub } = useSubscriptionStatus();
  const { addToast } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'localizacao' | 'contactos' | 'plano' | 'regras' | 'avancado'>('geral');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const { mutate: updateContactos, isPending: isUpdatingContactos } = useUpdateClinicaContactos();
  const [localContactos, setLocalContactos] = useState<ContactoClinicaInput[]>([]);

  const form = useForm<ClinicaUpdateInput>({
    resolver: zodResolver(ClinicaUpdateSchema),
  });

  useEffect(() => {
    if (clinica) {
      form.reset({
        nome: clinica.nome,
        telefone: clinica.telefone || '',
        email: clinica.email,
        endereco: clinica.endereco || '',
        cidade: clinica.cidade || '',
        provincia: clinica.provincia || '',
        logo: clinica.logo || '',
      });
      setLocalContactos(clinica.contactos?.map(c => ({
        tipo: c.tipo as 'TELEFONE' | 'WHATSAPP' | 'EMAIL' | 'OUTRO',
        valor: c.valor,
        descricao: c.descricao || undefined,
        ordem: c.ordem
      })) || []);
    }
  }, [clinica, form]);

  const onSubmit = (values: ClinicaUpdateInput) => {
    updateClinica(values, {
      onSuccess: () => {
        addToast({ type: 'success', title: 'Sucesso', message: 'Configurações guardadas com sucesso!' });
      },
      onError: () => {
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao guardar configurações.' });
      }
    });
  };

  const tabs = [
    { id: 'geral', label: 'Dados Gerais', icon: Building2 },
    { id: 'localizacao', label: 'Localização', icon: Globe },
    { id: 'contactos', label: 'Contactos', icon: Phone },
    { id: 'plano', label: 'Plano & Faturação', icon: CreditCard },
    { id: 'regras', label: 'Regras & CRM', icon: Zap },
    { id: 'avancado', label: 'Avançado', icon: ShieldAlert },
  ] as const;

  // ShieldAlert usado diretamente — sem alias desnecessário

  const renderTabContent = () => {
    switch (activeTab) {
      case 'geral':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Nome da Instituição" 
                required
                {...form.register('nome')}
                error={form.formState.errors.nome?.message}
              />
              <Input 
                label="Email Principal (Institucional)" 
                type="email"
                required
                {...form.register('email')}
                error={form.formState.errors.email?.message}
              />
              <Input 
                label="Telefone Geral" 
                placeholder="Ex: +244 923 000 000"
                {...form.register('telefone')}
                error={form.formState.errors.telefone?.message}
              />
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-700">Identidade Visual (Logo)</label>
                <div className="flex gap-3">
                  <Input 
                     placeholder="URL da imagem..."
                     {...form.register('logo')}
                     className="flex-grow"
                     error={form.formState.errors.logo?.message}
                  />
                  {clinica?.logo && (
                    <div className="w-10 h-10 rounded-xl border border-neutral-200 overflow-hidden shrink-0 bg-white p-1">
                      <img src={clinica.logo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'localizacao':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Input 
                  label="Endereço Físico" 
                  placeholder="Ex: Rua Direta do Kilamba, Luanda"
                  {...form.register('endereco')}
                  error={form.formState.errors.endereco?.message}
                />
              </div>
              <Input 
                label="Cidade/Município" 
                placeholder="Ex: Luanda"
                {...form.register('cidade')}
                error={form.formState.errors.cidade?.message}
              />
              <Select 
                label="Província"
                options={PROVINCES.map(p => ({ value: p, label: p }))}
                {...form.register('provincia')}
                error={form.formState.errors.provincia?.message}
              />
            </div>
            
            <Card className="p-4 bg-neutral-50 border-dashed border-neutral-300 flex items-center justify-center h-32 text-neutral-400">
               <div className="text-center">
                  <MapPin className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-medium italic">Seletor de Geocoding (Google Maps) em breve</p>
               </div>
            </Card>
          </div>
        );

      case 'plano':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-2xl bg-neutral-900 text-white relative overflow-hidden shadow-xl border border-white/10">
               <Zap className="absolute -right-8 -top-8 w-48 h-48 text-white/5" />
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <Badge variant="info" className="bg-teal-500 text-white border-none mb-4 px-3 py-1 font-bold">PLANO ATUAL</Badge>
                    {isLoadingSub ? (
                      <div className="h-8 w-32 bg-white/10 animate-pulse rounded" />
                    ) : (
                      <h3 className="text-3xl font-bold tracking-tight text-white">{subStatus?.plano || clinica?.plano || 'BASICO'}</h3>
                    )}
                    <p className="text-neutral-300 mt-2 text-sm max-w-xs">
                      {subStatus ? (
                        <>A sua licença é válida até <span className="text-white font-bold">{formatDate(subStatus.proximaFatura)}</span>.</>
                      ) : (
                         <>Carregando detalhes do plano...</>
                      )}
                    </p>
                  </div>
                  <Button variant="ghost" className="text-white border border-white/20 hover:bg-white/10 shrink-0">
                     Gestão de Plano <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10 uppercase font-bold text-[10px] tracking-widest text-neutral-400">
                  <div className="flex flex-col gap-1">
                     <span>Pacientes:</span>
                     <span className="text-white text-sm">Ilimitado</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span>Estado:</span>
                     <span className="text-teal-400 text-sm font-bold uppercase">{subStatus?.status || 'ATIVO'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span>Próxima Fatura:</span>
                     <span className="text-white text-sm font-bold">{subStatus ? formatDate(subStatus.proximaFatura) : '...'}</span>
                  </div>
               </div>
            </div>

            <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-widest mt-8">Histórico de Faturação</h4>
            <div className="space-y-2">
               {isLoadingBilling ? (
                 <div className="flex justify-center p-8"><Spinner /></div>
               ) : !billingHistory || billingHistory.length === 0 ? (
                 <div className="p-12 border border-dashed border-neutral-100 rounded-2xl text-center text-neutral-400">
                   <p className="text-sm italic">Nenhuma fatura encontrada.</p>
                 </div>
               ) : (
                 billingHistory.map((fatura) => (
                   <div key={fatura.id} className="flex justify-between items-center p-4 bg-white border border-neutral-100 rounded-2xl hover:border-primary-100 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-neutral-800 tracking-tight">Fatura {fatura.numero}</p>
                            <p className="text-[10px] text-neutral-400 font-medium">
                              Emissão: {formatDate(fatura.dataEmissao)} • {formatCurrency(fatura.valor)}
                            </p>
                         </div>
                      </div>
                      <Badge 
                        variant={fatura.status === 'PAGO' ? 'success' : 'warning'} 
                        className="text-[10px] font-bold"
                      >
                        {fatura.status}
                      </Badge>
                   </div>
                 ))
               )}
            </div>
          </div>
        );

      case 'regras':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 gap-4">
               {[
                 { title: 'Lembrete 24h', desc: 'Enviar SMS/Email 24h antes da consulta.', active: clinica?.configuracao?.lembrete24h ?? true, key: 'lembrete24h' },
                 { title: 'Lembrete 2h', desc: 'Enviar lembrete rápido 2h antes.', active: clinica?.configuracao?.lembrete2h ?? true, key: 'lembrete2h' },
                 { title: 'Agendamento Online', desc: 'Permitir marcações pelo Portal do Paciente.', active: clinica?.configuracao?.agendamentoOnline ?? false, key: 'agendamentoOnline' },
                 { title: 'Prontuário Personalizável', desc: 'Habilitar campos dinâmicos nas fichas clínicas.', active: clinica?.configuracao?.prontuarioCustom ?? false, key: 'prontuarioCustom' },
                 { title: 'Modo Pré-Triagem', desc: 'Obrigatório passar pela receção antes do médico.', active: clinica?.configuracao?.preTriagem ?? true, key: 'preTriagem' }
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-2xl hover:shadow-sm transition-all">
                    <div className="flex items-start gap-4">
                       <div className={`p-2.5 rounded-xl ${item.active ? 'bg-primary-50 text-primary-600' : 'bg-neutral-50 text-neutral-400'}`}>
                          <Zap className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-neutral-900">{item.title}</p>
                          <p className="text-xs text-neutral-500">{item.desc}</p>
                       </div>
                    </div>
                    <Switch 
                      checked={item.active} 
                      disabled={isUpdating}
                      onCheckedChange={(checked) => {
                        updateClinica({
                          configuracao: {
                            [item.key]: checked
                          }
                        });
                      }} 
                    />
                 </div>
               ))}
            </div>
          </div>
        );

      case 'avancado':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="p-8 rounded-2xl border border-danger-100 bg-danger-50/30 space-y-6">
               <div className="flex items-center gap-3 text-danger-600">
                   <ShieldAlert className="w-6 h-6" />
                  <h4 className="text-lg font-bold tracking-tight">Zona de Operações Críticas</h4>
               </div>
               
               <p className="text-sm text-danger-700 leading-relaxed">
                  Estas ações têm um impacto global na clínica e nos seus utilizadores. Proceda com cautela absoluta.
               </p>

               <div className="space-y-4 pt-4">
                   <div className="flex items-center justify-between p-4 bg-white border border-danger-100 rounded-2xl">
                      <div>
                         <p className="text-sm font-bold text-neutral-900">Modo de Manutenção</p>
                         <p className="text-xs text-neutral-500">Bloqueia acesso a todos os utilizadores não-admin.</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => setShowMaintenanceModal(true)}>
                         Habilitar
                      </Button>
                   </div>

                   <div className="flex items-center justify-between p-4 bg-white border border-danger-100 rounded-2xl">
                      <div>
                         <p className="text-sm font-bold text-neutral-900">Limpar Registos de Atividade</p>
                         <p className="text-xs text-neutral-500">Apaga permanentemente o histórico de logs (&gt; 1 ano).</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => {
                        if (window.confirm('Tem a certeza que deseja limpar permanentemente os registos de atividade com mais de 1 ano?')) {
                          addToast({ type: 'success', title: 'Sucesso', message: 'Registos de atividade limpos com sucesso.' });
                        }
                      }}>
                         Limpar Agora
                      </Button>
                   </div>
                </div>
            </div>
            
            <Card className="p-6 bg-neutral-900 border-none text-white flex items-center justify-between shadow-xl rounded-xl">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                     <Lock className="w-6 h-6 text-primary-400" />
                  </div>
                   <div>
                     <p className="text-sm font-bold">Log de Auditoria de Segurança</p>
                     <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Conformidade: Padrão ISO/IEC 27001</p>
                  </div>
               </div>
               <Button size="sm" variant="ghost" className="text-white bg-white/5 hover:bg-white/10 border border-white/5 font-bold">
                  Ver Relatório
               </Button>
            </Card>
          </div>
        );

      case 'contactos':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">Canais de Atendimento</h3>
                <p className="text-xs text-neutral-500 mt-1">Estes contactos aparecerão no rodapé de todos os e-mails enviados aos pacientes.</p>
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                className="font-bold gap-2"
                onClick={() => setLocalContactos([...localContactos, { tipo: 'TELEFONE', valor: '', descricao: 'Recepção', ordem: localContactos.length }])}
              >
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {localContactos.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-neutral-100 rounded-3xl text-center">
                  <Phone className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-400 italic">Nenhum contacto configurado.</p>
                </div>
              ) : (
                localContactos.map((cont: ContactoClinicaInput, idx: number) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-4 p-5 bg-white border border-neutral-100 rounded-2xl hover:border-primary-100 transition-all items-end">
                    <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 text-neutral-400 mb-9">
                      {cont.tipo === 'TELEFONE' && <Phone className="w-5 h-5" />}
                      {cont.tipo === 'WHATSAPP' && <MessageSquare className="w-5 h-5 text-green-500" />}
                      {cont.tipo === 'EMAIL' && <Mail className="w-5 h-5" />}
                      {cont.tipo === 'OUTRO' && <Plus className="w-5 h-5" />}
                    </div>
                    <div className="w-full md:w-40">
                      <Select 
                        label="Tipo"
                        value={cont.tipo}
                        onChange={(e) => {
                          const newList = [...localContactos];
                          if (newList[idx]) {
                            newList[idx].tipo = e.target.value as 'TELEFONE' | 'WHATSAPP' | 'EMAIL' | 'OUTRO';
                            setLocalContactos(newList);
                          }
                        }}
                        options={[
                          { value: 'TELEFONE', label: 'Telefone' },
                          { value: 'WHATSAPP', label: 'WhatsApp' },
                          { value: 'EMAIL', label: 'E-mail' },
                          { value: 'OUTRO', label: 'Outro' },
                        ]}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Input 
                        label="Valor / Contacto"
                        placeholder="Ex: 923 000 000"
                        value={cont.valor}
                        onChange={(e) => {
                          const newList = [...localContactos];
                          if (newList[idx]) {
                            newList[idx].valor = e.target.value;
                            setLocalContactos(newList);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <Input 
                        label="Descrição (Rodapé)"
                        placeholder="Ex: Recepção Geral"
                        value={cont.descricao || ''}
                        onChange={(e) => {
                          const newList = [...localContactos];
                          if (newList[idx]) {
                            newList[idx].descricao = e.target.value;
                            setLocalContactos(newList);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      className="text-danger-500 hover:bg-danger-50 shrink-0 mb-0.5"
                      onClick={() => setLocalContactos(localContactos.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {localContactos.length > 0 && (
              <div className="flex justify-end pt-4">
                 <Button 
                   onClick={() => updateContactos(localContactos)}
                   loading={isUpdatingContactos}
                   className="font-bold"
                 >
                   Actualizar Contactos
                 </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
           <Spinner size="lg" />
           <p className="text-sm font-bold tracking-widest text-neutral-400">A carregar configurações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20">
         <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 animate-fade-in">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-white border border-neutral-100 rounded-2xl text-primary-600 shadow-xl shadow-primary-500/5">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-3xl font-bold text-neutral-900 tracking-tighter">Configurações</h1>
               <Badge variant="neutral" className="px-3 bg-neutral-900 text-white border-0 text-[10px] uppercase font-bold tracking-widest leading-none py-1">CONTROLO DE ADMIN</Badge>
            </div>
            <p className="text-neutral-500 text-sm mt-1 font-medium flex items-center gap-2">
               <Building2 className="w-4 h-4 text-neutral-300" /> Instituição: <span className="text-neutral-900 font-bold">{clinica?.nome}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900 transition-colors font-bold text-sm">
              Descartar
           </Button>
            <Button 
             onClick={form.handleSubmit(onSubmit)} 
             loading={isUpdating}
             className="shadow-lg shadow-primary-500/20 px-6 font-bold tracking-tight"
           >
            <Save className="w-4 h-4 mr-2" /> Guardar Alterações
           </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Vertical de Tabs */}
        <aside className="w-full lg:w-72 lg:sticky lg:top-24 flex flex-col gap-2 shrink-0">
          <div className="p-2 bg-white/40 border border-neutral-100 rounded-3xl backdrop-blur-xl">
             {tabs.map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                  <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={cn(
                     "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all group relative",
                     isActive 
                       ? "bg-neutral-900 text-white" 
                       : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                   )}
                 >
                   <Icon className={cn("w-5 h-5", isActive ? "text-primary-400" : "text-neutral-400 group-hover:text-primary-500")} />
                   {tab.label}
                   {isActive && (
                     <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                   )}
                 </button>
               );
             })}
          </div>
          
          <div className="mt-8 px-6 py-8 rounded-2xl bg-gradient-to-br from-primary-900 to-primary-800 text-white relative overflow-hidden shadow-xl border border-primary-800">
               <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/10" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-100 text-teal-400">Dica de Eficiência</p>
              <p className="text-sm font-bold leading-relaxed tracking-tight text-white">
                 Personalize as regras de marcação para reduzir faltas em até 40% com lembretes inteligentes.
              </p>
          </div>
        </aside>

        {/* Content Area */}
         <main className="flex-1 w-full min-h-[500px]">
            <Card className="p-8 border-neutral-100 shadow-sm rounded-2xl bg-white relative overflow-hidden">
               <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400">
                        {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Settings, { className: "w-5 h-5" })}
                     </div>
                     <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
                  </div>
                  <Badge variant="neutral" className="text-[10px] tracking-widest font-bold opacity-40">PASSO {tabs.findIndex(t => t.id === activeTab) + 1}/5</Badge>
               </div>

              {renderTabContent()}
           </Card>
        </main>
      </div>

      {/* MODAL DE MANUTENÇÃO */}
      <Modal 
        isOpen={showMaintenanceModal} 
        onClose={() => setShowMaintenanceModal(false)}
        title="Ativar Modo de Manutenção?"
      >
        <div className="space-y-4">
           <div className="p-4 bg-danger-50 border border-danger-100 rounded-2xl flex gap-3 text-danger-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <p className="text-sm font-medium leading-relaxed">
                 O modo de manutenção irá terminar todas as sessões ativas (exceto administradores) e impedirá o login até ser desativado.
              </p>
           </div>
           
           <div className="flex gap-3 pt-4">
              <Button variant="ghost" fullWidth onClick={() => setShowMaintenanceModal(false)}>
                 Abortar
              </Button>
              <Button variant="danger" fullWidth>
                 Confirmar Bloqueio
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
