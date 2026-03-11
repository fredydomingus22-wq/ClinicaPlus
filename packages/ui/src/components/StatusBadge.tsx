import { EstadoAgendamento } from '@clinicaplus/types';

export const ESTADO_CONFIG: Record<EstadoAgendamento, { label: string; styles: string; dot: string }> = {
  PENDENTE:        { label: 'Pendente',        styles: 'bg-amber-50  text-amber-800  border-amber-300', dot: 'bg-amber-500' },
  CONFIRMADO:      { label: 'Confirmado',      styles: 'bg-blue-50   text-blue-800   border-blue-300',  dot: 'bg-blue-500' },
  EM_ESPERA:       { label: 'Em Espera',       styles: 'bg-indigo-50 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  EM_PROGRESSO:    { label: 'Em Progresso',    styles: 'bg-green-50  text-green-800  border-green-300', dot: 'bg-green-500' },
  CONCLUIDO:       { label: 'Concluído',       styles: 'bg-slate-100 text-slate-800  border-slate-300', dot: 'bg-slate-500' },
  CANCELADO:       { label: 'Cancelado',       styles: 'bg-red-50    text-red-800    border-red-300',   dot: 'bg-red-500' },
  NAO_COMPARECEU:  { label: 'Não Compareceu',  styles: 'bg-yellow-50 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
};

interface StatusBadgeProps {
  estado: EstadoAgendamento;
  className?: string;
}

export function StatusBadge({ estado, className = '' }: StatusBadgeProps) {
  const config = ESTADO_CONFIG[estado];
  
  if (!config) return null;
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wide border transition-colors
      ${config.styles}
      ${className}
    `}>
      <span className={`h-1.5 w-1.5 ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
