import React from 'react';
import { Stethoscope, ChevronRight } from 'lucide-react';
import { SPECIALTIES } from '@clinicaplus/utils';

interface StepSpecialtyProps {
  onSelect: (specialty: string) => void;
}

export const StepSpecialty: React.FC<StepSpecialtyProps> = ({ onSelect }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tight">Marcar Consulta</h1>
        <p className="text-neutral-600 mt-2 font-medium">Escolha a especialidade para começar o seu atendimento</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SPECIALTIES.map((spec) => (
          <button
            key={spec}
            onClick={() => onSelect(spec)}
            className="group p-6 bg-white border border-neutral-200 rounded-3xl hover:border-primary-500 hover:shadow-xl hover:shadow-primary-100 transition-all text-left relative overflow-hidden active:scale-95"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-neutral-900">{spec}</h3>
            <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest mt-1">Especialidade</p>
            <ChevronRight className="absolute right-6 bottom-6 w-5 h-5 text-neutral-200 group-hover:text-primary-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};
