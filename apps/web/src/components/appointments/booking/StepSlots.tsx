import React from 'react';
import { Button, Input } from '@clinicaplus/ui';
import { ChevronLeft, Calendar as CalendarIcon, Clock, History } from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import type { MedicoDTO } from '@clinicaplus/types';

interface StepSlotsProps {
  selectedMedico: MedicoDTO | undefined;
  selectedSpecialty: string | null;
  selectedDate: string;
  selectedTime: string | null;
  slots: (string | { time: string; available: boolean })[] | undefined;
  loading: boolean;
  onDateChange: (date: string) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
}

export const StepSlots: React.FC<StepSlotsProps> = ({
  selectedMedico,
  selectedSpecialty,
  selectedDate,
  selectedTime,
  slots,
  loading,
  onDateChange,
  onSelectTime,
  onBack
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-6">
        <Button variant="ghost" className="px-0 hover:bg-transparent text-neutral-600 hover:text-primary-900 font-mono text-xs uppercase tracking-widest" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
        </Button>
        <div className="text-right">
          <p className="text-xs text-neutral-500 font-black uppercase tracking-[0.2em] mb-1">Médico Responsável</p>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 uppercase tracking-tighter">Dr. {selectedMedico?.nome}</h1>
          <p className="text-xs text-primary-700 font-black uppercase tracking-widest">{selectedSpecialty}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-neutral-100 shadow-premium bg-white">
        <div className="lg:col-span-5 p-6 md:p-8 border-r border-neutral-100">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-neutral-500 mb-6 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> Seleccione o Dia
          </h3>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-none border-neutral-200 h-14 font-mono font-bold text-lg focus:ring-primary-900"
            min={new Date().toISOString().split('T')[0]}
          />
          <div className="mt-8 p-6 bg-neutral-50 border border-neutral-100">
            <p className="text-xs text-neutral-600 font-black uppercase tracking-widest leading-relaxed">
              Duração Média: <span className="text-primary-900 underline decoration-2 underline-offset-4">{selectedMedico?.duracaoConsulta || 30} MINUTOS</span>
            </p>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
              O horário seleccionado será reservado temporariamente por 15 minutos.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 md:p-8 bg-neutral-50/30">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-neutral-500 mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Disponibilidade: {formatDate(selectedDate)}
          </h3>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-12 bg-neutral-100 animate-pulse border border-neutral-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {slots && slots.length > 0 ? (
                slots.map((slot) => {
                  const isString = typeof slot === 'string';
                  const time = isString ? slot : slot.time;
                  const available = isString ? true : slot.available;

                  return (
                    <button
                      key={time}
                      data-testid="slot-button"
                      disabled={!available}
                      onClick={() => onSelectTime(time)}
                      className={`
                        h-12 flex flex-col items-center justify-center transition-all border font-mono font-bold text-sm
                        ${selectedTime === time 
                          ? 'bg-primary-900 text-white border-primary-900 shadow-xl' 
                          : available 
                            ? 'bg-white text-neutral-900 border-neutral-200 hover:border-primary-900 hover:bg-neutral-50' 
                            : 'bg-neutral-100 text-neutral-400 border-neutral-100 cursor-not-allowed grayscale'
                        }
                      `}
                    >
                      {time}
                      {!available && <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Ocupado</span>}
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-100">
                  <History className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
                  <p className="text-xs text-neutral-500 font-black uppercase tracking-widest">Sem slots disponíveis</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
