import React from 'react';
import { Button, Card, Input, Avatar, Badge } from '@clinicaplus/ui';
import { ChevronLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatDate, formatKwanza } from '@clinicaplus/utils';
import type { MedicoDTO, PacienteDTO } from '@clinicaplus/types';
import type { UseFormReturn } from 'react-hook-form';
import type { AgendamentoCreateInput } from '@clinicaplus/types';

interface StepConfirmationProps {
  selectedMedico: MedicoDTO | undefined;
  selectedPaciente?: PacienteDTO | undefined;
  selectedSpecialty: string | null;
  selectedDate: string;
  selectedTime: string | null;
  form: UseFormReturn<AgendamentoCreateInput>;
  isPending: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<unknown>;
  onBack: () => void;
}

export const StepConfirmation: React.FC<StepConfirmationProps> = ({
  selectedMedico,
  selectedPaciente,
  selectedSpecialty,
  selectedDate,
  selectedTime,
  form,
  isPending,
  onSubmit,
  onBack
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="text-center">
        <Button variant="ghost" className="mb-4 text-neutral-400" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Alterar detalhes
        </Button>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Confirmar Agendamento</h1>
      </header>

      <Card className="rounded-[40px] border-none shadow-2xl shadow-neutral-200 overflow-hidden">
        <div className="bg-primary-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CalendarIcon className="w-32 h-32" />
          </div>
          <div className="relative z-10 space-y-6">
            {selectedPaciente && (
               <div className="flex items-center gap-4 p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <Avatar 
                  initials={selectedPaciente.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()} 
                  size="sm"
                />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary-200">Paciente</p>
                  <p className="font-bold">{selectedPaciente.nome}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-6">
              <Avatar 
                initials={selectedMedico?.nome ? selectedMedico.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '??'} 
                size="lg"
                className="ring-4 ring-white/20"
              />
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-primary-200">Profissional</p>
                <h3 className="text-2xl font-black italic">
                  {selectedMedico?.nome.startsWith('Dr') ? selectedMedico.nome : `Dr. ${selectedMedico?.nome}`}
                </h3>
                <Badge variant="neutral" className="bg-white/10 text-white border-none mt-1 uppercase font-black text-[10px]">
                  {selectedSpecialty}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-8 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3" /> Data da Consulta
              </p>
              <p className="text-lg font-black text-neutral-900">{formatDate(selectedDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Horário
              </p>
              <p className="text-lg font-black text-neutral-900">{selectedTime}</p>
            </div>
          </div>

          <form id="agendamento-form" onSubmit={onSubmit} className="space-y-6 pt-6 border-t border-neutral-100">
            <Input
              label="Motivo da Consulta (Opcional)"
              placeholder="Ex: check-up de rotina, dor de cabeça persistente..."
              className="rounded-2xl h-14"
              {...form.register('motivoConsulta')}
              error={form.formState.errors.motivoConsulta?.message}
            />

            <div className="flex flex-col gap-3">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary-200 animate-pulse hover:animate-none"
                loading={isPending}
              >
                Confirmar Agendamento — {formatKwanza(selectedMedico?.preco || 5000)}
              </Button>
              <p className="text-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                O pagamento será efectuado na clínica no dia da consulta
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
