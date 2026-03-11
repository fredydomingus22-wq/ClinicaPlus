import React from 'react';
import { Button, Card, Input } from '@clinicaplus/ui';
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
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="px-0 hover:bg-transparent text-neutral-400 hover:text-neutral-900" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
        </Button>
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900">Dr. {selectedMedico?.nome}</h1>
          <p className="text-[12px] sm:text-sm text-primary-600 font-bold">{selectedSpecialty}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <Card className="lg:col-span-5 p-4 md:p-6 rounded-2xl md:rounded-3xl border-neutral-100 shadow-xl shadow-neutral-100/50">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-600" /> Seleccione o Dia
          </h3>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-2xl border-neutral-200 h-12 font-bold"
            min={new Date().toISOString().split('T')[0]}
          />
          <div className="mt-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider leading-relaxed">
              As consultas têm uma duração média de <span className="text-primary-700">{selectedMedico?.duracaoConsulta || 30} minutos</span>.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-7 p-4 md:p-6 rounded-2xl md:rounded-3xl border-neutral-100 shadow-xl shadow-neutral-100/50 min-h-[300px] md:min-h-[400px]">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" /> Horários em {formatDate(selectedDate)}
          </h3>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[46px] rounded-2xl bg-neutral-100 animate-pulse border-2 border-transparent w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {slots && slots.length > 0 ? (
                slots.map((slot) => {
                  const isString = typeof slot === 'string';
                  const time = isString ? slot : slot.time;
                  const available = isString ? true : slot.available;

                  return (
                    <button
                      key={time}
                      disabled={!available}
                      onClick={() => onSelectTime(time)}
                      className={`
                        p-2.5 sm:p-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all border-2
                        ${selectedTime === time 
                          ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200' 
                          : available 
                            ? 'bg-white text-neutral-700 border-neutral-100 hover:border-primary-300 hover:bg-primary-50' 
                            : 'bg-neutral-50 text-neutral-300 border-neutral-50 cursor-not-allowed grayscale'
                        }
                      `}
                    >
                      {time}
                      {!available && <span className="block text-[7px] sm:text-[8px] uppercase tracking-tighter mt-0.5">Ocupado</span>}
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center">
                  <History className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 font-medium">Sem horários disponíveis para este dia.</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
