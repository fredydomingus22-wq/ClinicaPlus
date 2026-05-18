import React from 'react';
import { Button, Card, Input, Avatar } from '@clinicaplus/ui';
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
      <header className="text-center space-y-3">
        <Button variant="ghost" className="mb-2 text-neutral-600 font-mono text-xs uppercase tracking-widest" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Alterar detalhes
        </Button>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tighter uppercase">Confirmar Agendamento</h1>
      </header>

      <Card className="rounded-none border-neutral-100 shadow-premium overflow-hidden">
        <div className="bg-primary-900 p-10 text-white relative">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <CalendarIcon className="w-40 h-40" />
          </div>
          <div className="relative z-10 space-y-10">
            {selectedPaciente && (
               <div className="flex items-center gap-5 p-4 bg-white/5 border border-white/10">
                <Avatar 
                  initials={selectedPaciente.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()} 
                  size="sm"
                  className="ring-1 ring-white/20"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Paciente</p>
                  <p className="font-bold tracking-tight">{selectedPaciente.nome}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-8">
              <Avatar 
                initials={selectedMedico?.nome ? selectedMedico.nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '??'} 
                size="lg"
                className="ring-2 ring-white/10"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-1">Profissional Responsável</p>
                <h3 className="text-3xl font-black tracking-tighter uppercase italic">
                  {selectedMedico?.nome.startsWith('Dr') ? selectedMedico.nome : `Dr. ${selectedMedico?.nome}`}
                </h3>
                <div className="inline-block border border-white/20 px-3 py-1 mt-3 bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em]">{selectedSpecialty}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-10 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase text-neutral-500 tracking-[0.2em] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Data do Agendamento
              </p>
              <p className="text-xl font-black text-neutral-900 font-mono tracking-tight">{formatDate(selectedDate)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase text-neutral-500 tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-4 h-4" /> Horário Técnico
              </p>
              <p className="text-xl font-black text-neutral-900 font-mono tracking-tight">{selectedTime}</p>
            </div>
          </div>

          <form id="agendamento-form" onSubmit={onSubmit} className="space-y-8 pt-10 border-t border-neutral-100">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-neutral-600">Motivo da Consulta (Opcional)</label>
              <Input
                placeholder="Descreva brevemente o sintoma ou necessidade..."
                className="rounded-none h-14 border-neutral-200 focus:ring-primary-900 font-bold"
                {...form.register('motivoConsulta')}
                error={form.formState.errors.motivoConsulta?.message}
              />
            </div>

            <div className="flex flex-col gap-4">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-16 rounded-none font-black text-lg uppercase tracking-widest bg-primary-900 hover:bg-black shadow-premium"
                loading={isPending}
              >
                Confirmar Agendamento — {formatKwanza(selectedMedico?.preco || 5000)}
              </Button>
              <p className="text-center text-xs text-neutral-500 font-mono uppercase tracking-[0.1em]">
                O PAGAMENTO SERÁ PROCESSADO NA CLÍNICA NO ACTO DO ATENDIMENTO
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
