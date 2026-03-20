import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  Copy, 
  Check, 
  Key, 
  Webhook as WebhookIcon, 
  Info,
  ExternalLink 
} from 'lucide-react';
import { 
  Button, 
  Card, 
  Table, 
  Badge, 
  Modal, 
  Input, 
  Spinner,
  Tabs,
  Switch
} from '@clinicaplus/ui';
import { NavLink } from 'react-router-dom';
import { 
  useApiKeys, 
  useCreateApiKey, 
  useRevokeApiKey 
} from '../../hooks/useApiKeys';
import { 
  useWebhooks, 
  useCreateWebhook, 
  useUpdateWebhook, 
  useDeleteWebhook, 
  useTestWebhook 
} from '../../hooks/useWebhooks';
import { 
  EscopoApiKey, 
  ApiKeyDTO, 
  ApiKeyResponse, 
  EventoWebhook,
  WebhookDTO 
} from '@clinicaplus/types';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { PlanGate } from '../../components/PlanGate';
import { Play } from 'lucide-react';

export default function IntegracoesPage() {
  const [activeTab, setActiveTab] = useState('apikeys');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<EscopoApiKey[]>([EscopoApiKey.READ_PACIENTES]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Webhook State
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookDTO | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    nome: '',
    url: '',
    eventos: [] as EventoWebhook[],
    ativo: true
  });

  const { data: keys, isLoading } = useApiKeys();
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();

  const { data: webhooks, isLoading: isLoadingWebhooks } = useWebhooks();
  const createWebhookMutation = useCreateWebhook();
  const updateWebhookMutation = useUpdateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();
  const testWebhookMutation = useTestWebhook();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;

    createMutation.mutate({
      nome: newKeyName,
      escopos: selectedScopes,
    }, {
      onSuccess: (data: ApiKeyResponse) => {
        setGeneratedToken(data.token || null);
        setNewKeyName('');
        // We don't close modal yet so they can see the token
      }
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = (id: string) => {
    if (window.confirm('Tem a certeza que deseja revogar esta API Key? Esta acção é irreversível e interromperá qualquer sistema que a utilize.')) {
      revokeMutation.mutate(id);
    }
  };

  const toggleScope = (scope: EscopoApiKey) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope) 
        : [...prev, scope]
    );
  };

  const handleWebhookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookForm.nome || !webhookForm.url || webhookForm.eventos.length === 0) {
      toast.error('Preencha todos os campos e selecione pelo menos um evento');
      return;
    }

    if (editingWebhook) {
      updateWebhookMutation.mutate({ 
        id: editingWebhook.id, 
        data: webhookForm 
      }, {
        onSuccess: () => {
          setIsWebhookModalOpen(false);
          setEditingWebhook(null);
        }
      });
    } else {
      createWebhookMutation.mutate(webhookForm, {
        onSuccess: () => {
          setIsWebhookModalOpen(false);
          setWebhookForm({ nome: '', url: '', eventos: [], ativo: true });
        }
      });
    }
  };

  const handleEditWebhook = (wh: WebhookDTO) => {
    setEditingWebhook(wh);
    setWebhookForm({
      nome: wh.nome,
      url: wh.url,
      eventos: wh.eventos,
      ativo: wh.ativo
    });
    setIsWebhookModalOpen(true);
  };

  const handleDeleteWebhook = (id: string) => {
    if (window.confirm('Deseja realmente remover este webhook?')) {
      deleteWebhookMutation.mutate(id);
    }
  };

  const handleTestWebhook = (id: string) => {
    testWebhookMutation.mutate(id);
  };

  const toggleWebhookEvent = (event: EventoWebhook) => {
    setWebhookForm(prev => ({
      ...prev,
      eventos: prev.eventos.includes(event)
        ? prev.eventos.filter(e => e !== event)
        : [...prev.eventos, event]
    }));
  };

  return (
    <main className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Integrações</h1>
          <p className="text-neutral-500 text-sm font-medium">Gere as ligações externas da sua clínica via API e Webhooks.</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => {
            if (activeTab === 'apikeys') {
              setGeneratedToken(null);
              setIsModalOpen(true);
            } else {
              setEditingWebhook(null);
              setWebhookForm({ nome: '', url: '', eventos: [], ativo: true });
              setIsWebhookModalOpen(true);
            }
          }}
          className="shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {activeTab === 'apikeys' ? 'Criar Nova Chave' : 'Configurar Webhook'}
        </Button>
      </div>

      <Tabs 
        items={[
          { id: 'apikeys', label: 'API Keys' },
          { id: 'webhooks', label: 'Webhooks' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'apikeys' ? (
        <PlanGate planoMinimo="PRO" fallback={
          <Card className="p-12 text-center border-neutral-200/60 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">API Keys (PRO)</h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto font-medium">
              A gestão de API Keys está disponível apenas a partir do plano <strong className="text-primary-600">PRO</strong>.
            </p>
            <NavLink to="/admin/configuracao/subscricao">
              <Button variant="primary">Ver Planos</Button>
            </NavLink>
          </Card>
        }>
          <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Spinner /></div>
            ) : keys && keys.length > 0 ? (
              <Table
                data={keys}
                keyExtractor={(key: ApiKeyDTO) => key.id}
                columns={[
                  {
                    header: 'Nome',
                    accessor: (key: ApiKeyDTO) => (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Key className="w-4 h-4 text-neutral-500" />
                        </div>
                        <span className="font-bold text-neutral-900">{key.nome}</span>
                      </div>
                    )
                  },
                  {
                    header: 'Prefixo',
                    accessor: (key: ApiKeyDTO) => (
                      <code className="text-[11px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 border border-neutral-200 rounded">{key.prefixo}...</code>
                    )
                  },
                  {
                    header: 'Escopos',
                    accessor: (key: ApiKeyDTO) => (
                      <div className="flex flex-wrap gap-1">
                        {key.escopos.map(s => (
                          <Badge key={s} variant="neutral" className="text-[10px] bg-neutral-50 text-neutral-500 font-medium lowercase">
                            {s.replace('READ_', '').replace('WRITE_', '').replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )
                  },
                  {
                    header: 'Estado',
                    accessor: (key: ApiKeyDTO) => (
                      <Badge variant={key.ativo ? 'success' : 'neutral'} className="text-[10px] font-bold">
                        {key.ativo ? 'Activa' : 'Revogada'}
                      </Badge>
                    )
                  },
                  {
                    header: 'Último Uso',
                    accessor: (key: ApiKeyDTO) => (
                      <span className="text-neutral-500 text-xs font-medium">
                        {key.ultimoUso ? format(new Date(key.ultimoUso), 'dd/MM/yy HH:mm') : 'Nunca usado'}
                      </span>
                    )
                  },
                  {
                    header: 'Acções',
                    accessor: (key: ApiKeyDTO) => (
                      <div className="flex justify-end gap-2">
                        {key.ativo && (
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(key.id)}
                            className="p-1.5 h-8 w-8 text-neutral-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                            title="Revogar chave"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-neutral-100 flex items-center justify-center rounded-full mx-auto mb-4">
                  <Key className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Nenhuma API Key encontrada</h3>
                <p className="text-neutral-500 text-sm mt-1 max-w-xs mx-auto font-medium">
                  Crie a sua primeira chave para começar a integrar com sistemas externos de forma programática.
                </p>
              </div>
            )}
          </Card>
        </PlanGate>
      ) : (
        <PlanGate planoMinimo="PRO" fallback={
          <Card className="p-12 text-center border-neutral-200/60 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Webhooks (PRO)</h3>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto font-medium">
              A integração via Webhooks está disponível apenas a partir do plano <strong className="text-primary-600">PRO</strong>.
            </p>
            <NavLink to="/admin/configuracao/subscricao">
              <Button variant="primary">Ver Planos</Button>
            </NavLink>
          </Card>
        }>
          <Card className="p-0 overflow-hidden border-neutral-200/60 shadow-sm">
            {isLoadingWebhooks ? (
              <div className="p-12 flex justify-center"><Spinner /></div>
            ) : webhooks && webhooks.length > 0 ? (
              <Table
                data={webhooks}
                keyExtractor={(wh: WebhookDTO) => wh.id}
                columns={[
                  {
                    header: 'Endpoint',
                    accessor: (wh: WebhookDTO) => (
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                          <WebhookIcon className="w-5 h-5 text-neutral-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900">{wh.nome}</span>
                          <code className="text-[10px] text-neutral-400 truncate max-w-[200px] mt-0.5">{wh.url}</code>
                        </div>
                      </div>
                    )
                  },
                  {
                    header: 'Eventos',
                    accessor: (wh: WebhookDTO) => (
                      <div className="flex flex-wrap gap-1">
                        {wh.eventos.map(e => (
                          <Badge key={e} variant="neutral" className="text-[10px] bg-neutral-50 text-neutral-500 font-medium">
                            {e.split('.')[1]}
                          </Badge>
                        ))}
                      </div>
                    )
                  },
                  {
                    header: 'Estado',
                    accessor: (wh: WebhookDTO) => (
                      <div className="flex items-center gap-2">
                        <Badge variant={wh.ativo ? 'success' : 'neutral'} className="text-[10px] font-bold">
                          {wh.ativo ? 'Activo' : 'Pausado'}
                        </Badge>
                        {wh.ultimoStatus && (
                          <Badge variant={wh.sucesso ? 'success' : 'error'} className="text-[10px] py-0 px-1 font-bold">
                            {wh.ultimoStatus}
                          </Badge>
                        )}
                      </div>
                    )
                  },
                  {
                    header: 'Acções',
                    accessor: (wh: WebhookDTO) => (
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestWebhook(wh.id)}
                          className="p-1.5 h-8 w-8 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Testar entrega"
                          disabled={testWebhookMutation.isPending}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditWebhook(wh)}
                          className="p-1.5 h-8 w-8 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 transition-colors"
                          title="Editar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="p-1.5 h-8 w-8 text-neutral-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-neutral-100 flex items-center justify-center rounded-full mx-auto mb-4">
                  <WebhookIcon className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">Nenhum Webhook configurado</h3>
                <p className="text-neutral-500 text-sm mt-1 max-w-xs mx-auto font-medium">
                  Receba notificações em tempo real no seu sistema quando eventos ocorrem na ClinicaPlus.
                </p>
              </div>
            )}
          </Card>
        </PlanGate>
      )}

      {/* Manual Section */}
      <Card className="bg-neutral-50 border-neutral-200/60 border-dashed shadow-none p-6">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-white border border-neutral-200 flex items-center justify-center shrink-0 rounded-lg">
            <Info className="w-5 h-5 text-neutral-400" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-sm uppercase tracking-wider">Documentação da API</h3>
            <p className="text-neutral-500 text-xs mt-1 leading-relaxed font-medium">
              Consulte a nossa referência técnica para saber como utilizar as API Keys para ler e escrever dados na plataforma de forma programática.
            </p>
            <a 
              href="https://docs.clinicaplus.io" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center text-primary-600 text-[11px] font-bold uppercase mt-3 hover:underline"
            >
              Abrir Documentação <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </Card>

      {/* Modal Criar API Key */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Gerar Nova API Key"
      >
        <div className="space-y-6 py-2">
          {!generatedToken ? (
            <form onSubmit={handleCreate} className="space-y-6">
              <Input 
                label="Nome da Chave" 
                placeholder="Ex: Integração CRM, Dashboard Externo..." 
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                required
              />

              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-700 block">Escopos Permitidos</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(EscopoApiKey).map(scope => (
                    <label 
                      key={scope} 
                      className={`
                        flex items-center justify-between p-3 border transition-all cursor-pointer rounded-lg
                        ${selectedScopes.includes(scope) 
                          ? 'border-industrial-text bg-industrial-bg' 
                          : 'border-industrial-border hover:border-neutral-300'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedScopes.includes(scope)} 
                          onChange={() => toggleScope(scope)}
                          className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-neutral-900 capitalize">
                          {scope.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                      <Badge variant="neutral" className="text-[10px]">
                        {scope.startsWith('READ') ? 'Leitura' : 'Escrita'}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || !newKeyName}
                  className="flex-1"
                >
                  {createMutation.isPending ? <Spinner size="sm" /> : 'Gerar Token'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-4 bg-[#fff7ed] border border-[#fed7aa] rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#ea580c] shrink-0" />
                <div>
                  <h4 className="font-bold text-[#9a3412] text-xs uppercase font-mono">Guarde o seu token agora!</h4>
                  <p className="text-[#c2410c] text-[11px] mt-1 leading-tight">
                    Por motivos de segurança, este token será mostrado apenas esta vez. Se o perder, terá de gerar uma nova chave.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-700 block text-center">TEU TOKEN API</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-neutral-50 p-4 border border-neutral-200 rounded-lg font-mono text-sm break-all text-neutral-900 shadow-inner">
                    {generatedToken}
                  </div>
                  <Button 
                    variant="primary"
                    onClick={() => handleCopy(generatedToken!)}
                    className="shrink-0 h-auto"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-industrial-text text-white font-mono uppercase text-[10px] tracking-widest mt-4"
              >
                Concluído, Guardei o Token
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Configurar Webhook */}
      <Modal 
        isOpen={isWebhookModalOpen} 
        onClose={() => setIsWebhookModalOpen(false)} 
        title={editingWebhook ? "Editar Webhook" : "Configurar Webhook"}
      >
        <form onSubmit={handleWebhookSubmit} className="space-y-6 py-2">
          <Input 
            label="Nome Identificador" 
            placeholder="Ex: ERP Produção, App Mobile..." 
            value={webhookForm.nome}
            onChange={e => setWebhookForm(prev => ({ ...prev, nome: e.target.value }))}
            required
          />

          <Input 
            label="URL do Endpoint (HTTPS Recomendado)" 
            placeholder="https://sua-api.com/webhooks" 
            value={webhookForm.url}
            onChange={e => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
            required
          />

          <div className="flex items-center justify-between p-4 border border-neutral-100 rounded-xl bg-neutral-50/50">
             <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900">Estado do Webhook</span>
                <span className="text-xs text-neutral-500 font-medium whitespace-nowrap">Ativar ou pausar o envio de eventos</span>
             </div>
             <Switch 
                checked={webhookForm.ativo}
                onCheckedChange={(checked) => setWebhookForm(prev => ({ ...prev, ativo: checked }))}
             />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-700 block">Eventos para subscrever</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(EventoWebhook).map(event => (
                <label 
                  key={event} 
                  className={`
                    flex items-center gap-3 p-3 border transition-all cursor-pointer rounded-lg
                    ${webhookForm.eventos.includes(event as EventoWebhook) 
                      ? 'border-primary-600 bg-primary-50' 
                      : 'border-neutral-100 hover:border-neutral-300'}
                  `}
                >
                  <input 
                    type="checkbox" 
                    checked={webhookForm.eventos.includes(event as EventoWebhook)} 
                    onChange={() => toggleWebhookEvent(event as EventoWebhook)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-neutral-900">
                    {event}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsWebhookModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createWebhookMutation.isPending || updateWebhookMutation.isPending}
              className="flex-1"
            >
              {(createWebhookMutation.isPending || updateWebhookMutation.isPending) ? <Spinner size="sm" /> : 'Guardar Configuração'}
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
