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
      <div className="flex items-center justify-between border-b border-neutral-100 pb-6">
        <Button variant="ghost" className="px-0 hover:bg-transparent text-neutral-600 hover:text-primary-900 font-mono text-xs uppercase tracking-widest" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
        </Button>
        <div className="text-right">
          <p className="text-xs text-neutral-500 font-black uppercase tracking-[0.2em] mb-1">Especialidade Seleccionada</p>
          <h1 className="text-2xl font-black text-neutral-900 uppercase tracking-tighter">{selectedSpecialty}</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner size="lg" />
          <p className="text-neutral-600 font-mono font-bold uppercase tracking-widest text-xs">A filtrar especialistas...</p>
        </div>
      ) : (
        <div className="space-y-0 border-t border-l border-neutral-100">
          {!medicos || medicos.length === 0 ? (
            <div className="text-center py-20 bg-white border-r border-b border-neutral-100">
              <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">Nenhum médico disponível para esta especialidade.</p>
              <Button variant="ghost" onClick={onBack} className="mt-6 border border-neutral-200 rounded-none">Tentar outra</Button>
            </div>
          ) : (
            medicos.map((medico) => (
              <button
                key={medico.id}
                onClick={() => onSelect(medico.id)}
                className="w-full flex items-center gap-6 p-6 bg-white border-r border-b border-neutral-100 hover:bg-neutral-50 transition-all text-left group active:scale-[0.99]"
              >
                <Avatar 
                   initials={medico.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()} 
                  size="md"
                  className="ring-2 ring-neutral-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary-900 transition-colors truncate tracking-tight">
                    {medico.nome.startsWith('Dr') ? medico.nome : `Dr. ${medico.nome}`}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-600 font-black uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-primary-600" /> Luanda, Angola
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-primary-700 font-black bg-neutral-50 border border-neutral-200 px-3 py-1 uppercase tracking-widest whitespace-nowrap">
                      <CreditCard className="w-3.5 h-3.5 shadow-sm" /> {formatKwanza(medico.preco || 5000)}
                    </span>
                  </div>
                </div>
                <div className="bg-primary-900 text-white px-8 py-3 rounded-none font-black text-xs uppercase tracking-[0.2em] hidden sm:block group-hover:bg-black transition-colors">
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
