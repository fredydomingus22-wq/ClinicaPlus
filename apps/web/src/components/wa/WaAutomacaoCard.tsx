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

// --- Configuração visual + campos por tipo de automação (ref: ui-automacoes.md) ---

interface ConfigField {
  key: string;
  label: string;
  type: 'time' | 'textarea' | 'dias';
  default?: string;
  vars?: string;
  placeholder?: string;
}

const AUTOMACAO_CONFIG: Record<string, {
  titulo: string;
  descricao: string;
  icon: React.ElementType;
  cores: string;
  badge?: string;
  campos: ConfigField[];
}> = {
  MARCACAO_CONSULTA: {
    titulo: 'Marcação de Consultas',
    descricao: 'Pacientes marcam consultas via WhatsApp 24/7.',
    icon: Calendar,
    cores: 'bg-primary-50 text-primary-600',
    campos: [
      { key: 'horarioInicio', label: 'Horário de início', type: 'time', default: '08:00' },
      { key: 'horarioFim',    label: 'Horário de fim',    type: 'time', default: '18:00' },
      { key: 'diasAtivos',    label: 'Dias activos',       type: 'dias' },
      { key: 'msgForaHorario', label: 'Mensagem fora do horário', type: 'textarea',
        vars: '{inicio}, {fim}',
        placeholder: 'Olá! O nosso bot de marcações funciona das {inicio} às {fim}. Volta amanhã! 😊',
        default: 'Olá! O bot de marcações está disponível das {inicio} às {fim}.' },
    ],
  },
  LEMBRETE_24H: {
    titulo: 'Lembrete 24h antes',
    descricao: 'Mensagem automática enviada na véspera da consulta.',
    icon: Clock,
    cores: 'bg-blue-50 text-blue-600',
    campos: [
      { key: 'template', label: 'Mensagem de lembrete', type: 'textarea',
        vars: '{nome}, {data}, {hora}, {medico}, {especialidade}, {clinica}',
        placeholder: 'Olá {nome}! 👋 Lembrete da consulta amanhã às *{hora}* com *{medico}*.\n\nConfirmas? Responde *SIM* ou *NÃO*.',
        default: 'Olá {nome}! 👋 Lembrete da consulta amanhã às *{hora}* com *{medico}*.' },
    ],
  },
  LEMBRETE_2H: {
    titulo: 'Lembrete 2h antes',
    descricao: 'Segundo lembrete enviado 2 horas antes da consulta.',
    icon: Clock,
    cores: 'bg-indigo-50 text-indigo-600',
    campos: [
      { key: 'template', label: 'Mensagem de lembrete', type: 'textarea',
        vars: '{nome}, {data}, {hora}, {medico}, {especialidade}, {clinica}',
        placeholder: 'Olá {nome}! A tua consulta com *{medico}* é daqui a 2 horas, às *{hora}*. 🏥',
        default: 'Olá {nome}! A consulta é daqui a 2 horas, às *{hora}*.' },
    ],
  },
  CONFIRMACAO_CANCELAMENTO: {
    titulo: 'Confirmação por resposta',
    descricao: 'Paciente responde SIM/NÃO ao lembrete para confirmar ou cancelar.',
    icon: UserCheck,
    cores: 'bg-success-50 text-success-600',
    badge: 'Requer lembrete activo',
    campos: [
      { key: 'msgConfirmado', label: 'Mensagem ao confirmar', type: 'textarea',
        vars: '{nome}',
        placeholder: '✅ Consulta confirmada! Até logo, {nome}.' },
      { key: 'msgCancelado', label: 'Mensagem ao cancelar', type: 'textarea',
        vars: '{nome}',
        placeholder: 'Consulta cancelada. Para remarcar escreve *marcar*.' },
    ],
  },
  BOAS_VINDAS: {
    titulo: 'Boas-vindas',
    descricao: 'Mensagem automática ao primeiro contacto de um número desconhecido.',
    icon: MessageSquare,
    cores: 'bg-amber-50 text-amber-600',
    campos: [
      { key: 'mensagem', label: 'Mensagem de boas-vindas', type: 'textarea',
        vars: '{clinica}',
        placeholder: 'Olá! 👋 Bem-vindo a {clinica}.\nPara marcar uma consulta escreve *marcar*.' },
    ],
  },
};

/** Nomes dos dias da semana em pt-AO */
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
  const info = AUTOMACAO_CONFIG[automacao.tipo] || {
    titulo: automacao.tipo.replace(/_/g, ' '),
    descricao: 'Configuração de automação personalizada.',
    icon: Settings,
    cores: 'bg-neutral-50 text-neutral-600',
    badge: undefined,
    campos: [],
  };

  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(automacao.configuracao || {});
  const [dirty, setDirty] = useState(false);

  const linkedInstance = instancias.find(i => i.id === automacao.waInstanciaId);
  const instanceLabel = linkedInstance 
    ? (linkedInstance.numeroTelefone || linkedInstance.evolutionName) 
    : 'Nenhuma';

  /** Actualiza um campo e marca como dirty */
  const handleChange = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

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
                {info.badge && (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                    {info.badge}
                  </span>
                )}
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
                 
                 {/* Campos específicos por tipo de automação */}
                 {info.campos.map((campo) => (
                   <div key={campo.key}>
                     {campo.type === 'time' && (
                       <div>
                         <label className="text-xs font-bold text-neutral-700">{campo.label}</label>
                         <input
                           type="time"
                           className="mt-1 block w-full rounded border border-neutral-200 px-3 py-1.5 text-sm font-medium focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                           value={(form[campo.key] as string) ?? campo.default ?? ''}
                           onChange={(e) => handleChange(campo.key, e.target.value)}
                         />
                       </div>
                     )}

                     {campo.type === 'textarea' && (
                       <div>
                         <label className="text-xs font-bold text-neutral-700">{campo.label}</label>
                         <Textarea
                           className="mt-1 min-h-[80px] font-medium text-sm leading-relaxed"
                           value={(form[campo.key] as string) ?? campo.default ?? ''}
                           onChange={(e) => handleChange(campo.key, e.target.value)}
                           placeholder={campo.placeholder}
                         />
                         {campo.vars && (
                           <p className="text-[10px] text-neutral-400 mt-1">
                             Variáveis disponíveis: <code className="bg-neutral-50 px-1 rounded text-[10px]">{campo.vars}</code>
                           </p>
                         )}
                       </div>
                     )}

                     {campo.type === 'dias' && (
                       <div>
                         <label className="text-xs font-bold text-neutral-700">{campo.label}</label>
                         <div className="flex gap-1.5 mt-2">
                           {DIAS_SEMANA.map((dia, i) => {
                             const activos = (form.diasAtivos as number[]) ?? [1, 2, 3, 4, 5];
                             const isActive = activos.includes(i);
                             return (
                               <button
                                 key={i}
                                 type="button"
                                 onClick={() => {
                                   const next = isActive
                                     ? activos.filter((d: number) => d !== i)
                                     : [...activos, i].sort();
                                   handleChange('diasAtivos', next);
                                 }}
                                 className={`w-9 h-9 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                   isActive
                                     ? 'bg-primary-500 text-white border-primary-600 shadow-sm'
                                     : 'bg-neutral-50 text-neutral-400 border-neutral-200 hover:border-primary-300'
                                 }`}
                               >
                                 {dia}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}
                   </div>
                 ))}

                 {/* Botão guardar — só aparece com alterações */}
                 {dirty && (
                   <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                     <p className="text-[10px] text-amber-600 font-bold">⚠ Alterações não guardadas</p>
                     <Button 
                       size="sm" 
                       variant="primary" 
                       className="h-8 text-[11px] px-6 rounded-lg font-bold"
                       disabled={!!isSaving}
                       onClick={() => {
                         if (automacao.id) {
                           onSaveConfig?.(automacao.id, form);
                           setDirty(false);
                         }
                       }}
                       loading={!!isSaving}
                     >
                       <Save className="w-3 h-3 mr-2" /> Guardar configuração
                     </Button>
                   </div>
                 )}
               </div>
             )}
          </div>
        )}
      </div>
      {hasSeparator && <div className="h-px w-full bg-neutral-100/80" />}
    </div>
  );
}
