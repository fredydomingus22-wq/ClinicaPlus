import React from 'react';
import { Avatar, Badge } from '@clinicaplus/ui';
import { ChevronRight } from 'lucide-react';
import type { PacienteDTO } from '@clinicaplus/types';

interface PatientRowProps {
  paciente: PacienteDTO;
  onClick?: () => void;
}

export function PatientRow({ paciente, onClick }: PatientRowProps) {
  const initials = paciente.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  const hasAllergies = paciente.alergias && paciente.alergias.length > 0;

  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl transition-all
        ${onClick ? 'hover:border-primary-300 hover:shadow-md cursor-pointer group' : ''}
      `}
    >
      <Avatar initials={initials} size="md" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-900 truncate">
            {paciente.nome}
          </h3>
          <span className="text-xs text-neutral-400 font-mono">
            {paciente.numeroPaciente}
          </span>
        </div>
        
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-neutral-500">
            {paciente.genero === 'MASCULINO' ? 'Masc' : 'Fem'}, {new Date().getFullYear() - new Date(paciente.dataNascimento).getFullYear()} anos
          </p>
          {hasAllergies && (
            <Badge variant="error" className="scale-90">Alergias</Badge>
          )}
        </div>
      </div>

      <div className="text-right hidden sm:block">
        <p className="text-xs text-neutral-400">Telemóvel</p>
        <p className="text-sm font-medium text-neutral-700">{paciente.telefone}</p>
      </div>

      {onClick && (
        <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-primary-500 transition-colors" />
      )}
    </div>
  );
}
