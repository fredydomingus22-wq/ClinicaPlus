import React from 'react';
import { Card, Button } from '@clinicaplus/ui';
import { Zap, MessageCircle, Calendar, Clock, ArrowRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface WaActividadeRecenteProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actividade?: any[];
  isLoading?: boolean;
}

export function WaActividadeRecente({ actividade, isLoading }: WaActividadeRecenteProps) {
  const logs = actividade || [];

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'CONSULTA': return Calendar;
      case 'MENSAGEM': return MessageCircle;
      default: return Clock;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getUserName = (log: any) => {
    // Tenta extrair um nome do paciente a partir da mensagem se não houver um campo específico
    if (log.pacienteNome) return log.pacienteNome;
    // Fallback simples
    if (log.msg && log.msg.includes('paciente')) {
      const parts = log.msg.split('paciente ');
      if (parts.length > 1) {
        return parts[1].split(' ')[0];
      }
    }
    return 'Paciente Externa';
  };

  return (
    <Card className="p-0 border-neutral-200/60 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="flex-1 divide-y divide-neutral-50 overflow-y-auto max-h-[600px]">
        {isLoading ? (
          // Skeleton Loading
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-neutral-100 rounded w-1/3" />
                <div className="h-3 bg-neutral-100 rounded w-2/3" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          // Empty State
          <div className="p-12 flex flex-col items-center justify-center text-center h-full">
            <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-neutral-300" />
            </div>
            <p className="text-sm font-bold text-neutral-700">Nenhuma actividade ainda</p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
              As marcações e interações aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const Icon = getIcon(log.tipo);
            const isClickable = log.agendamentoId;
            
            const content = (
              <div className="p-4 flex items-start gap-3 hover:bg-neutral-50/50 transition-colors group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:border-primary-100 transition-all">
                  <Icon className="w-4 h-4 text-neutral-500 group-hover:text-primary-500" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <User className="w-3 h-3 text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-700 truncate">
                      {getUserName(log)}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium shrink-0 ml-auto">
                      {formatDistanceToNow(new Date(log.data), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-500 leading-snug line-clamp-2">
                    {log.msg}
                  </p>
                </div>
              </div>
            );

            return (
              <div key={log.id} className="relative">
                {isClickable ? (
                  <Link to={`/admin/agendamentos/${log.agendamentoId}`} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-neutral-50/50 border-t border-neutral-100 mt-auto">
        <Button 
          variant="ghost" 
          fullWidth
          className="h-9 text-[10px] font-bold text-neutral-500 uppercase tracking-widest hover:text-primary-600 hover:bg-white transition-all group"
        >
          Ver histórico completo 
          <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Card>
  );
}
