import React from 'react';
import { Clock, User, Stethoscope, ChevronRight } from 'lucide-react';
import { StatusBadge, Avatar } from '@clinicaplus/ui';
import type { AgendamentoDTO } from '@clinicaplus/types';

interface AppointmentCardProps {
  agendamento: AgendamentoDTO;
  onClick?: () => void;
  showDoctor?: boolean;
}

export function AppointmentCard({ agendamento, onClick, showDoctor = false }: AppointmentCardProps) {
  const date = new Date(agendamento.dataHora);
  const time = date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  const patientInitials = (agendamento.paciente?.nome || 'P').split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase();

  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl transition-all
        ${onClick ? 'hover:border-primary-300 hover:shadow-md cursor-pointer group' : ''}
      `}
    >
      {/* Time and Icon */}
      <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-neutral-100 pr-4">
        <Clock className="h-4 w-4 text-neutral-400 mb-1" />
        <span className="text-sm font-bold text-neutral-900">{time}</span>
      </div>

      {/* Patient Info */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <Avatar initials={patientInitials} size="sm" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 truncate">
            {agendamento.paciente?.nome}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {showDoctor ? (
              <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> Dr(a). {agendamento.medico?.nome.split(' ').pop()}
              </p>
            ) : (
              <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
                <User className="h-3 w-3" /> {agendamento.paciente?.numeroPaciente}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status and Action */}
      <div className="flex items-center gap-3 ml-auto">
        <StatusBadge estado={agendamento.estado} className="scale-90" />
        {onClick && (
          <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-primary-500 transition-colors" />
        )}
      </div>
    </div>
  );
}
