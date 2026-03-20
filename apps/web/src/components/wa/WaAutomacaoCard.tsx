import React, { useState } from 'react';
import { 
  Settings, 
  MessageSquare, 
  Clock, 
  Calendar, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { 
  Switch, 
  Button, 
  Badge,
  Textarea
} from '@clinicaplus/ui';

const AUTOMACAO_INFO: Record<string, {
  titulo: string;
  descricao: string;
  icon: React.ElementType;
  cores: string;
}> = {
  MARCACAO_CONSULTA: {
    titulo: 'Marcação de Consulta',
    descricao: 'Permite que pacientes marquem consultas via chat 24/7.',
    icon: Calendar,
    cores: 'bg-primary-50 text-primary-600'
  },
  LEMBRETE_24H: {
    titulo: 'Lembrete 24h',
    descricao: 'Envia um lembrete automático 1 dia antes da consulta.',
    icon: Clock,
    cores: 'bg-blue-50 text-blue-600'
  },
  LEMBRETE_2H: {
    titulo: 'Lembrete 2h',
    descricao: 'Envia um lembrete final 2 horas antes da consulta.',
    icon: Clock,
    cores: 'bg-indigo-50 text-indigo-600'
  },
  CONFIRMACAO_CANCELAMENTO: {
    titulo: 'Confirmação de Cancelamento',
    descricao: 'Processa respostas de confirmação ou cancelamento.',
    icon: UserCheck,
    cores: 'bg-success-50 text-success-600'
  },
  BOAS_VINDAS: {
    titulo: 'Boas-vindas',
    descricao: 'Saudação automática para novos contactos.',
    icon: MessageSquare,
    cores: 'bg-amber-50 text-amber-600'
  }
};

interface WaAutomacaoCardProps {
  automacao: { 
    id?: string; 
    tipo: string; 
    ativo: boolean; 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configuracao?: any; 
    waInstanciaId?: string;
  };
  instancias?: { id: string; evolutionName: string; numeroTelefone?: string }[];
  onToggle: (tipo: string, id: string | undefined, active: boolean) => void;
  onSaveConfig?: (id: string, config: Record<string, unknown>) => void;
  disabled?: boolean;
  isDisconnected?: boolean;
  isToggling?: boolean;
  isSaving?: boolean;
  hasSeparator?: boolean;
}

export function WaAutomacaoCard({ 
  automacao, 
  instancias = [],
  onToggle, 
  onSaveConfig,
  disabled, 
  isDisconnected, 
  isToggling, 
  isSaving,
  hasSeparator 
}: WaAutomacaoCardProps) {
  const info = AUTOMACAO_INFO[automacao.tipo] || {
    titulo: automacao.tipo.replace(/_/g, ' '),
    descricao: 'Configuração de automação personalizada.',
    icon: Settings,
    cores: 'bg-neutral-50 text-neutral-600'
  };

  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState((automacao.configuracao?.prompt as string) || "");

  const linkedInstance = instancias.find(i => i.id === automacao.waInstanciaId);
  const instanceLabel = linkedInstance 
    ? (linkedInstance.numeroTelefone || linkedInstance.evolutionName) 
    : 'Nenhuma';

  return (
    <div className="group hover:bg-neutral-50/50 transition-colors">
      <div className="p-4 sm:p-5">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${info.cores} border border-black/5`}>
              <info.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-neutral-900 leading-none">{info.titulo}</h4>
                {automacao.ativo && <Badge variant="success" className="text-[9px] uppercase font-bold py-0.5">Activo</Badge>}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 mt-1.5">
                <p className="text-xs text-neutral-500 font-medium leading-relaxed hidden sm:block">
                  {info.descricao}
                </p>
                {automacao.id && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-tight">
                    <Smartphone className="w-3 h-3" />
                    <span>{instanceLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0" title={isDisconnected ? "Liga o WhatsApp primeiro para activar esta automação" : undefined}>
             {automacao.ativo && isDisconnected && (
               <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded text-[10px] font-bold text-amber-700 uppercase tracking-widest animate-pulse">
                 <AlertCircle className="w-3 h-3" /> Offline
               </div>
             )}
            <Switch 
              checked={automacao.ativo}
              onCheckedChange={(checked) => onToggle(automacao.tipo, automacao.id, checked)}
              disabled={disabled || isDisconnected || isToggling}
            />
          </div>
        </div>
        
        <p className="text-xs text-neutral-500 mt-3 font-medium leading-relaxed sm:hidden">
          {info.descricao}
        </p>

        {automacao.ativo && (
          <div className="mt-4 pt-3 border-t border-neutral-100/50 animate-slide-down ml-0 sm:ml-16">
             <button 
               onClick={() => setExpanded(!expanded)}
               className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-primary-600 transition-colors"
             >
               {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
               Configurações da Automação
             </button>

             {expanded && (
               <div className="mt-4 space-y-4 max-w-2xl bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <label htmlFor={`prompt-${automacao.id}`} className="text-xs font-bold text-neutral-700">
                       Prompt do Fluxo (AI)
                     </label>
                     <span className="text-[10px] font-medium text-neutral-400 italic">Define como a IA deve conversar</span>
                   </div>
                   <Textarea 
                      id={`prompt-${automacao.id}`}
                      className="min-h-[120px] font-medium text-sm leading-relaxed"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Instruções para o comportamento da automação..."
                   />
                 </div>
                 <div className="flex justify-end pt-2">
                   <Button 
                    size="sm" 
                    variant="primary" 
                    className="h-8 text-[11px] px-6 rounded-lg font-bold"
                    disabled={!!isSaving || prompt === automacao.configuracao?.prompt}
                    onClick={() => automacao.id && onSaveConfig?.(automacao.id, { ...automacao.configuracao, prompt })}
                    loading={!!isSaving}
                   >
                     <Save className="w-3 h-3 mr-2" /> Guardar
                   </Button>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>
      {hasSeparator && <div className="h-px w-full bg-neutral-100/80" />}
    </div>
  );
}
