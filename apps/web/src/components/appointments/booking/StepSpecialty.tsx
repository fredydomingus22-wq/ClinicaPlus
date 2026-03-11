import React from 'react';
import { Stethoscope, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, Spinner } from '@clinicaplus/ui';
import type { EspecialidadeDTO } from '@clinicaplus/types';

interface StepSpecialtyProps {
  specialties: EspecialidadeDTO[] | undefined;
  loading: boolean;
  onSelect: (specialtyId: string) => void;
  onBack?: (() => void) | undefined;
}

export const StepSpecialty: React.FC<StepSpecialtyProps> = ({ specialties, loading, onSelect, onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center">
        {onBack && (
          <Button variant="ghost" className="mb-4 text-neutral-400" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar ao Paciente
          </Button>
        )}
        <h1 className="text-4xl font-black text-neutral-900 tracking-tight">Marcar Consulta</h1>
        <p className="text-neutral-500 mt-2 font-medium">Escolha a especialidade para começar o seu atendimento</p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="lg" />
          <p className="text-neutral-500 font-medium">A carregar especialidades...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialties?.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-3xl border-2 border-dashed border-neutral-100 italic text-neutral-400">
              Nenhuma especialidade configurada.
            </div>
          ) : (
            specialties?.map((spec) => (
              <button
                key={spec.id}
                onClick={() => onSelect(spec.id)}
                className="group p-6 bg-white border border-neutral-200 rounded-3xl hover:border-primary-500 hover:shadow-xl hover:shadow-primary-100 transition-all text-left relative overflow-hidden active:scale-95"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-neutral-900 truncate">{spec.nome}</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">Especialidade</p>
                <ChevronRight className="absolute right-6 bottom-6 w-5 h-5 text-neutral-200 group-hover:text-primary-500 transition-colors" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
