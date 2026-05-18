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
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center space-y-3">
        {onBack && (
          <Button variant="ghost" className="mb-2 text-neutral-600" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        )}
        <h1 className="text-4xl font-black text-neutral-900 tracking-tighter uppercase">Marcar Consulta</h1>
        <p className="text-neutral-600 font-medium max-w-lg mx-auto leading-relaxed">
          Seleccione a especialidade clínica para iniciar o agendamento técnico.
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner size="lg" />
          <p className="text-neutral-600 font-mono font-bold uppercase tracking-widest text-xs">A carregar catálogo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-neutral-100 shadow-premium">
          {specialties?.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white border-r border-b border-neutral-100 italic text-neutral-500 font-mono text-sm">
              NENHUMA ESPECIALIDADE CONFIGURADA
            </div>
          ) : (
            specialties?.map((spec) => (
              <button
                key={spec.id}
                onClick={() => onSelect(spec.id)}
                className="group p-8 bg-white border-r border-b border-neutral-100 hover:bg-neutral-50 transition-all text-left relative overflow-hidden active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-neutral-100 text-neutral-500 flex items-center justify-center mb-6 group-hover:bg-primary-900 group-hover:text-white transition-all duration-300">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-neutral-900 tracking-tight leading-tight mb-1">{spec.nome}</h3>
                <p className="text-xs text-neutral-500 font-black uppercase tracking-[0.15em]">Especialidade Técnica</p>
                <ChevronRight className="absolute right-6 bottom-6 w-5 h-5 text-neutral-300 group-hover:text-primary-900 transition-colors" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
