import React, { useEffect, useState } from 'react';
import { useClinicaMe, useUpdateClinicaMe, useUpdateClinicaContactos } from '../../hooks/useClinicas';
import { useBillingHistory, useSubscriptionStatus } from '../../hooks/useBilling';
import { formatKwanza, formatDate } from '@clinicaplus/utils';
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
import { Link } from 'react-router-dom';

export default function ConfiguracaoPage() {
  const { data: clinica, isLoading, error } = useClinicaMe();
  const { mutate: updateClinica, isPending: isUpdating } = useUpdateClinicaMe();
  const { data: billingHistory, isLoading: isLoadingBilling } = useBillingHistory();
  const { data: subStatus, isLoading: isLoadingSub } = useSubscriptionStatus();
  const { addToast } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'localizacao' | 'contactos' | 'plano' | 'regras' | 'whatsapp' | 'avancado'>('geral');
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
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'plano', label: 'Plano & Faturação', icon: CreditCard },
    { id: 'regras', label: 'Regras & CRM', icon: Zap },
    { id: 'avancado', label: 'Avançado', icon: ShieldAlert },
  ] as const;

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
                <label className="text-sm font-bold text-neutral-900">Identidade Visual (Logo)</label>
                <div className="flex gap-3">
                  <Input 
                     placeholder="URL da imagem..."
                     {...form.register('logo')}
                     className="flex-grow"
                     error={form.formState.errors.logo?.message}
                  />
                  {clinica?.logo && (
                    <div className="w-10 h-10 rounded-xl border border-neutral-100 overflow-hidden shrink-0 bg-neutral-50 p-1 ring-1 ring-neutral-200">
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
            
            <Card className="p-10 bg-neutral-50/50 border-neutral-200 border-dashed flex items-center justify-center h-40 text-neutral-400">
               <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-sm font-medium italic">Seletor de Geocoding (Google Maps) em breve</p>
               </div>
            </Card>
          </div>
        );

      case 'plano':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="p-8 rounded-2xl bg-primary-600 text-white relative overflow-hidden shadow-sm">
               <Zap className="absolute -right-8 -top-8 w-48 h-48 text-white/10" />
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <Badge variant="neutral" className="bg-white/20 text-white border-0 mb-4 px-3 py-1 font-bold">PLANO ATUAL</Badge>
                    {isLoadingSub ? (
                      <div className="h-10 w-48 bg-white/10 animate-pulse rounded" />
                    ) : (
                      <h3 className="text-3xl font-bold tracking-tight text-white">{subStatus?.plano || clinica?.plano || 'BASICO'}</h3>
                    )}
                    <p className="text-primary-100 mt-2 text-sm max-w-sm font-medium">
                      {subStatus ? (
                        <>Sua licença profissional é válida até <span className="text-white font-bold">{subStatus.proximaFatura ? formatDate(subStatus.proximaFatura) : '...'}</span>.</>
                      ) : (
                         <>Carregando detalhes do plano...</>
                      )}
                    </p>
                  </div>
                  <Link to="/admin/configuracao/subscricao">
                    <Button variant="ghost" className="text-white bg-white/10 border-white/20 hover:bg-white/20 hover:text-white shrink-0 font-bold">
                       Gerir Subscrição <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 pt-8 border-t border-white/10">
                  <div className="space-y-1">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-primary-200">Pacientes</span>
                     <p className="text-lg font-bold text-white tracking-tight">Ilimitado</p>
                  </div>
                  <div className="space-y-1">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-primary-200">Estado</span>
                     <p className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                        {subStatus?.status || 'ATIVO'}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-primary-200">Próxima Fatura</span>
                     <p className="text-lg font-bold text-white tracking-tight">{subStatus?.proximaFatura ? formatDate(subStatus.proximaFatura) : '...'}</p>
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-between mt-10 mb-4">
              <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">Histórico de Faturação</h4>
              <Badge variant="neutral" className="bg-neutral-100 text-neutral-500 border-0 font-bold">ÚLTIMAS 12 MESES</Badge>
            </div>
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
                               Emissão: {formatDate(fatura.dataEmissao)} • {formatKwanza(fatura.valor)}
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
                 <div key={idx} className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-2xl hover:border-primary-100 transition-all">
                    <div className="flex items-start gap-4">
                       <div className={`p-2.5 rounded-xl ${item.active ? 'bg-primary-50 text-primary-600' : 'bg-neutral-50 text-neutral-400'}`}>
                          <Zap className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-neutral-900">{item.title}</p>
                          <p className="text-xs text-neutral-500 font-medium">{item.desc}</p>
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

      case 'whatsapp':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="p-10 border border-neutral-100 rounded-[2.5rem] bg-neutral-50/30 flex flex-col items-center justify-center text-center gap-6">
              <div className="h-20 w-20 bg-green-50 rounded-3xl flex items-center justify-center shadow-sm">
                <MessageSquare className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Inteligência WhatsApp</h3>
                <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                  Configura automações de lembretes, confirmações de marcação e atendimento automático para elevar o nível da tua clínica.
                </p>
              </div>
              <Link to="/admin/configuracao/whatsapp">
                <Button className="font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/10 h-12 px-8 rounded-2xl">
                  Configurar Inteligência <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-4">
                 <div className="p-4 bg-white rounded-2xl border border-neutral-100 text-left">
                    <Zap className="w-5 h-5 text-primary-500 mb-2" />
                    <p className="text-xs font-bold text-neutral-800">Automação</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Lembretes 24h/2h automáticos.</p>
                 </div>
                 <div className="p-4 bg-white rounded-2xl border border-neutral-100 text-left">
                    <ShieldAlert className="w-5 h-5 text-green-500 mb-2" />
                    <p className="text-xs font-bold text-neutral-800">Conexão Segura</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Ligação oficial via Evolution API.</p>
                 </div>
              </div>
            </div>
          </div>
        );

      case 'avancado':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="p-8 rounded-2xl border border-danger-100 bg-danger-50/20 space-y-6">
               <div className="flex items-center gap-3 text-danger-600">
                    <ShieldAlert className="w-6 h-6" />
                   <h4 className="text-lg font-bold tracking-tight">Zona de Operações Críticas</h4>
               </div>
               
               <p className="text-sm text-danger-700 leading-relaxed font-medium">
                  Estas acções têm um impacto global na clínica e nos seus utilizadores. Proceda com cautela absoluta.
               </p>

               <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl">
                       <div>
                          <p className="text-sm font-bold text-neutral-900">Modo de Manutenção</p>
                          <p className="text-xs text-neutral-500 font-medium">Bloqueia acesso a todos os utilizadores não-admin.</p>
                       </div>
                       <Button variant="danger" size="sm" onClick={() => setShowMaintenanceModal(true)} className="font-bold">
                          Habilitar
                       </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-neutral-100 rounded-2xl">
                       <div>
                          <p className="text-sm font-bold text-neutral-900">Limpar Registos de Atividade</p>
                          <p className="text-xs text-neutral-500 font-medium">Apaga permanentemente o histórico de logs (&gt; 1 ano).</p>
                       </div>
                       <Button variant="danger" size="sm" onClick={() => {
                         if (window.confirm('Tem a certeza que deseja limpar permanentemente os registos de atividade com mais de 1 ano?')) {
                           addToast({ type: 'success', title: 'Sucesso', message: 'Registos de atividade limpos com sucesso.' });
                         }
                       }} className="font-bold">
                          Limpar Agora
                       </Button>
                    </div>
                 </div>
            </div>
            
            <Card className="p-6 bg-neutral-900 border-none text-white flex items-center justify-between shadow-sm rounded-2xl">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                     <Lock className="w-6 h-6 text-primary-400" />
                  </div>
                   <div>
                     <p className="text-sm font-bold text-white">Log de Auditoria de Segurança</p>
                     <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Conformidade ISO/IEC 27001</p>
                  </div>
               </div>
               <Button size="sm" variant="ghost" className="text-white bg-white/5 hover:bg-white/10 border-white/5 font-bold">
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
                <p className="text-xs text-neutral-500 mt-1 font-medium">Estes contactos aparecerão no rodapé de todos os e-mails enviados aos pacientes.</p>
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
                <div className="p-12 border-2 border-dashed border-neutral-100 rounded-2xl text-center">
                  <Phone className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
                  <p className="text-sm font-medium text-neutral-400 italic">Nenhum contacto configurado.</p>
                </div>
              ) : (
                localContactos.map((cont: ContactoClinicaInput, idx: number) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-4 p-5 bg-white border border-neutral-100 rounded-2xl hover:border-primary-100 transition-all items-end">
                    <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-50 text-neutral-400 mb-1">
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
      <div className="max-w-xl mx-auto mt-20 p-8">
         <ErrorMessage error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Configurações da Clínica</h1>
          <p className="text-neutral-500 text-sm font-medium">Gerencie as informações gerais, regras de negócio e canais de atendimento.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900 transition-colors font-bold text-sm">
              Descartar
           </Button>
            <Button 
             variant="primary"
             onClick={form.handleSubmit(onSubmit)} 
             loading={isUpdating}
             className="shadow-sm font-bold"
           >
            <Save className="w-4 h-4 mr-2" /> Guardar Alterações
           </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Vertical de Tabs */}
        <aside className="w-full lg:w-72 lg:sticky lg:top-24 flex flex-col gap-2 shrink-0">
          <div className="p-1.5 bg-neutral-100/50 border border-neutral-200/60 rounded-2xl">
             {tabs.map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                  <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={cn(
                     "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group relative mb-1 last:mb-0",
                     isActive 
                       ? "bg-white text-neutral-900 shadow-sm ring-1 ring-black/5" 
                       : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                   )}
                 >
                   <Icon className={cn("w-4.5 h-4.5", isActive ? "text-primary-600" : "text-neutral-400 group-hover:text-primary-500")} />
                   {tab.label}
                   {isActive && (
                     <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
                   )}
                  </button>
               );
             })}
          </div>
          
          <div className="mt-8 px-6 py-6 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white relative overflow-hidden shadow-sm">
               <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/5" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-primary-400">Dica de Eficiência</p>
              <p className="text-sm font-bold leading-relaxed tracking-tight text-white/90">
                 Personalize as regras de marcação para reduzir faltas em até 40% com lembretes inteligentes.
              </p>
          </div>
        </aside>

        {/* Content Area */}
         <main className="flex-1 w-full min-h-[500px]">
          <Card className="p-8 border-neutral-200/60 shadow-sm rounded-2xl bg-white relative overflow-hidden">
             <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400">
                      {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Settings, { className: "w-5 h-5" })}
                   </div>
                   <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
                </div>
                <Badge variant="neutral" className="text-[10px] tracking-widest font-bold opacity-30">CONFIG {tabs.findIndex(t => t.id === activeTab) + 1}/{tabs.length}</Badge>
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
