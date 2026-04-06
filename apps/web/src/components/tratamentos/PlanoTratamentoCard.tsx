import React from 'react';
import { Card, Badge } from '@clinicaplus/ui';
import { formatDate } from '@clinicaplus/utils';
import { Activity, Calendar } from 'lucide-react';

interface PlanoProgressBarProps {
  sessoesRealizadas: number;
  totalSessoes: number;
}

export const PlanoProgressBar: React.FC<PlanoProgressBarProps> = ({
  sessoesRealizadas,
  totalSessoes
}) => {
  const percentage = totalSessoes > 0 
    ? Math.min(100, Math.round((sessoesRealizadas / totalSessoes) * 100)) 
    : 0;

  return (
    <div className="w-full mt-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Progresso do Plano
        </span>
        <span className="text-xs font-semibold text-neutral-900">
          Concluído {sessoesRealizadas} de {totalSessoes} Sessões
        </span>
      </div>
      <div className="bg-neutral-200 h-2 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-primary-600 transition-all duration-700 ease-in-out relative group"
          style={{ width: `${percentage}%` }}
        >
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-white/20 blur-[1px]" />
        </div>
      </div>
    </div>
  );
};

import { PlanoTratamentoDTO } from '@clinicaplus/types';

export const PlanoTratamentoCard: React.FC<{ plano: PlanoTratamentoDTO }> = ({ plano }) => {
  const isConcluido = plano.estado === 'CONCLUIDO';
  const sessoesRealizadas = plano.sessoesRealizadas || plano._count?.sessoes || 0;

  return (
    <Card className="p-5 border-neutral-100 shadow-sm hover:shadow-md hover:border-primary-100 transition-all group overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className={`p-2.5 rounded-lg ${isConcluido ? 'bg-green-50 text-green-600' : 'bg-primary-50 text-primary-600'} transition-colors`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 group-hover:text-primary-700 transition-colors">
              {plano.tipoTratamento?.nome || 'Tratamento Especializado'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
              <Calendar className="w-3.5 h-3.5" />
              Início: {formatDate(plano.dataInicio)}
              {plano.frequenciaSemana > 0 && ` • ${plano.frequenciaSemana}x / semana`}
            </div>
          </div>
        </div>
        
        <Badge variant={isConcluido ? 'success' : 'info'} className="rounded-md px-2.5 py-1">
          {plano.estado}
        </Badge>
      </div>

      {plano.descricao && (
        <p className="mt-3 text-sm text-neutral-600 line-clamp-2 leading-relaxed italic border-l-2 border-neutral-100 pl-3">
          "{plano.descricao}"
        </p>
      )}

      <PlanoProgressBar 
        sessoesRealizadas={sessoesRealizadas} 
        totalSessoes={plano.totalSessoes} 
      />

      <div className="mt-4 pt-4 border-t border-neutral-50 flex items-center justify-between">
         <span className="text-[10px] font-mono text-neutral-400">
           ID: {plano.id.substring(0, 8)}
         </span>
         <button className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors hover:underline">
           Gerir Sessões →
         </button>
      </div>
    </Card>
  );
};
