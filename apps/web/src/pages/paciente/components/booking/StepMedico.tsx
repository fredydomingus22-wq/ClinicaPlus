import React from 'react';
import { Button, Spinner, Avatar } from '@clinicaplus/ui';
import { ChevronLeft, MapPin, CreditCard, AlertCircle } from 'lucide-react';
import { formatKwanza } from '@clinicaplus/utils';
import type { MedicoDTO } from '@clinicaplus/types';

interface StepMedicoProps {
  medicos: MedicoDTO[] | undefined;
  loading: boolean;
  selectedSpecialty: string | null;
  onSelect: (medicoId: string) => void;
  onBack: () => void;
}

export const StepMedico: React.FC<StepMedicoProps> = ({ 
  medicos, 
  loading, 
  selectedSpecialty, 
  onSelect, 
  onBack 
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="px-0 hover:bg-transparent text-neutral-400 hover:text-neutral-900" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Voltar para especialidades
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-neutral-900">{selectedSpecialty}</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="lg" />
          <p className="text-neutral-600 font-medium animate-pulse">A procurar melhores especialistas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {!medicos || medicos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-neutral-200">
              <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-600 font-medium">Não encontramos médicos para esta especialidade.</p>
              <Button variant="ghost" onClick={onBack} className="mt-4">Tentar outra</Button>
            </div>
          ) : (
            medicos.map((medico) => (
              <button
                key={medico.id}
                onClick={() => onSelect(medico.id)}
                className="w-full flex items-center gap-6 p-6 bg-white border border-neutral-200 rounded-3xl hover:border-primary-500 hover:shadow-xl hover:shadow-primary-100 transition-all text-left active:scale-[0.98]"
              >
                <Avatar 
                  initials={medico.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()} 
                  size="lg" 
                  className="ring-4 ring-neutral-50"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-neutral-900 truncate">Dr. {medico.nome}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-sm text-neutral-600 font-medium">
                      <MapPin className="w-4 h-4 text-primary-500" /> Luanda, Angola
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-secondary-600 font-bold bg-secondary-50 px-2 py-0.5 rounded-lg">
                      <CreditCard className="w-4 h-4" /> {formatKwanza(5000)}
                    </span>
                  </div>
                </div>
                <div className="bg-primary-600 text-white px-6 py-2 rounded-2xl font-black text-sm shadow-lg shadow-primary-200">
                  Seleccionar
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
