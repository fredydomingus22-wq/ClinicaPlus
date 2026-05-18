import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Input, Spinner, Select, Switch } from '@clinicaplus/ui';
import { Bot, Save } from 'lucide-react';
import { useBotIntegracao, useSaveBotIntegracao, BotIntegracaoDTO } from '../../hooks/useBots';
import { WaInstancia } from '../../api/whatsapp';

interface Props {
  instancias: WaInstancia[];
}

export function BotIntegracaoCard({ instancias }: Props) {
  const { data: bot, isLoading } = useBotIntegracao();
  const saveMutation = useSaveBotIntegracao();
  
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<BotIntegracaoDTO>({
    instanciaId: '',
    provedor: 'TYPEBOT',
    apiUrl: 'https://typebot.io',
    flowId: '',
    apiToken: '',
    triggerKeyword: '#bot',
    unknownMessage: 'Desculpe, não compreendi. Envie #bot para ver as opções.',
    expireTime: 20,
    ativo: false,
    variaveisGlobais: {
      saudacaoAudioUrl: '',
      logoUrl: ''
    }
  });

  useEffect(() => {
    if (bot) {
      setForm({
        ...bot,
        variaveisGlobais: bot?.variaveisGlobais || { saudacaoAudioUrl: '', logoUrl: '' }
      });
    } else if (instancias.length > 0) {
      setForm(prev => ({ ...prev, instanciaId: instancias[0]?.id || '' }));
    }
  }, [bot, instancias]);

  const handleSave = () => {
    saveMutation.mutate(form, {
      onSuccess: () => {
        setIsOpen(false);
      }
    });
  };

  const updateVariavel = (key: string, value: string) => {
    setForm(prev => ({
      ...prev,
      variaveisGlobais: {
        ...prev.variaveisGlobais,
        [key]: value
      }
    }));
  };

  return (
    <>
      <Card className="p-6 border-neutral-200/60 shadow-sm flex flex-col justify-between h-full bg-gradient-to-br from-white to-blue-50/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Bot className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-bold text-neutral-900 tracking-tight leading-tight">Bots & Chatbots</h3>
               <p className="text-xs text-neutral-500 font-medium">Typebot, Dialogflow, N8N</p>
            </div>
          </div>
          <Badge variant={bot?.ativo ? 'success' : 'neutral'} className="text-[10px] uppercase font-bold">
            {bot?.ativo ? 'Ativo' : 'Não Configurado'}
          </Badge>
        </div>

        <div className="space-y-3 mb-6 flex-1">
          <p className="text-sm text-neutral-600">
            Conecte o seu fluxo interativo de auto-atendimento (ex: Typebot) direto na sua conta do WhatsApp para que o paciente agende consultas sozinho 24/7.
          </p>
        </div>

        <Button 
          variant={bot?.ativo ? 'outline' : 'primary'} 
          className="w-full font-bold shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="w-4 h-4 mr-2" />
          Configurar Agente Bot
        </Button>
      </Card>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Setup do Agente Conversacional (Bot)"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button 
              loading={saveMutation.isPending} 
              onClick={handleSave}
              disabled={!form.instanciaId || !form.provedor}
            >
              <Save className="w-4 h-4 mr-2" /> Guardar Conexão
            </Button>
          </>
        }
      >
        {isLoading ? (
          <div className="py-10 flex justify-center"><Spinner /></div>
        ) : (
          <div className="py-2 space-y-6">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <p className="text-sm font-bold text-blue-900">Activar Intervenção do Bot</p>
                <p className="text-xs text-blue-700 font-medium tracking-tight">O fluxo conversacional será iniciado no número seleccionado.</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({...form, ativo: v})} />
            </div>

            <div className="space-y-5">
              <Select 
                label="Número WhatsApp Direcionado para a IA"
                value={form.instanciaId || ''}
                onChange={(e) => setForm({...form, instanciaId: e.target.value})}
                options={instancias.map(i => ({ value: i.id, label: i.numeroTelefone || i.evolutionName }))}
              />
            </div>

            <div className="pt-2 animate-fade-in">
              <div className="p-5 border border-neutral-200 rounded-xl bg-white shadow-sm">
                <h4 className="text-sm font-bold text-neutral-900 mb-1">
                  Personalização da Clínica no WhatsApp
                </h4>
                <p className="text-xs text-neutral-500 mb-5">
                  A Inteligência Artificial já sabe que está a falar em nome da sua clínica, mas pode adicionar uma receção calorosa fornecendo mídia personalizada.
                </p>
                
                <div className="space-y-4">
                  <Input 
                    label="Mensagem de Áudio de Boas-Vindas (Link) - Opcional"
                    placeholder="Ex: https://suaclinica.com/audio/bemvindo.mp3"
                    value={String(form.variaveisGlobais?.saudacaoAudioUrl || '')}
                    onChange={(e) => updateVariavel('saudacaoAudioUrl', e.target.value)}
                  />
                  <Input 
                    label="Logótipo da Clínica para Envio Visual (Link) - Opcional"
                    placeholder="Ex: https://suaclinica.com/logo.png"
                    value={String(form.variaveisGlobais?.logoUrl || '')}
                    onChange={(e) => updateVariavel('logoUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
