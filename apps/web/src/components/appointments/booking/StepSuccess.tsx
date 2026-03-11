import React, { useRef } from 'react';
import { Button, Card } from '@clinicaplus/ui';
import { CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import type { MedicoDTO, PacienteDTO } from '@clinicaplus/types';
import { ComprovativoAgendamentoPrint } from '../../print/ComprovativoAgendamentoPrint';

interface StepSuccessProps {
  selectedMedico: MedicoDTO | undefined;
  selectedPaciente: PacienteDTO | undefined;
  tipo: string;
  selectedSpecialty: string | null;
  selectedDate: string;
  selectedTime: string | null;
  onFinish: () => void;
  onViewAppointments?: () => void;
  isStaff?: boolean;
}

export const StepSuccess: React.FC<StepSuccessProps> = ({
  selectedMedico,
  selectedPaciente,
  tipo,
  selectedSpecialty,
  selectedDate,
  selectedTime,
  onFinish,
  onViewAppointments,
  isStaff = false
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };
  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-8 animate-in zoom-in duration-700">
      <div className="w-24 h-24 bg-success-500 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-success-200 animate-bounce">
        <CheckCircle2 className="w-12 h-12" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tight">Tudo OK!</h1>
        <p className="text-lg text-neutral-500 font-medium">O agendamento foi confirmado com sucesso.</p>
      </div>

      <Card className="p-8 rounded-[40px] bg-neutral-900 text-white text-left relative overflow-hidden group">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-1000" />
        
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Comprovativo Digital</p>
            <h3 className="text-2xl font-black italic">
              {selectedMedico?.nome.startsWith('Dr') ? selectedMedico.nome : `Dr. ${selectedMedico?.nome}`}
            </h3>
            <p className="text-primary-400 font-bold">{selectedSpecialty}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
            <div>
              <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Data</p>
              <p className="font-black">{formatDate(selectedDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Hora</p>
              <p className="font-black">{selectedTime}</p>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3 text-xs text-neutral-400 bg-white/5 p-4 rounded-2xl">
            <AlertCircle className="w-4 h-4 text-warning-400" />
            <p>Por favor, {isStaff ? 'informe o paciente para chegar' : 'chegue'} 15 minutos antes da hora marcada.</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {onViewAppointments && (
          <Button 
            className="w-full h-14 rounded-2xl font-black text-lg bg-white text-neutral-900 border-2 border-neutral-100 hover:bg-neutral-50"
            onClick={onViewAppointments}
          >
            {isStaff ? 'Ver Agendamentos da Clínica' : 'Ver Meus Agendamentos'}
          </Button>
        )}
        <Button 
          variant="secondary"
          className="w-full h-14 rounded-2xl font-black text-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border-none flex items-center justify-center gap-2"
          onClick={handlePrint}
        >
          <Printer className="w-5 h-5" />
          Imprimir Comprovativo
        </Button>
        <Button 
          variant="ghost" 
          className="text-neutral-400"
          onClick={onFinish}
        >
          {isStaff ? 'Fechar' : 'Voltar para o Início'}
        </Button>
      </div>

      {/* Hidden Print Component */}
      <ComprovativoAgendamentoPrint 
        ref={printRef}
        clinicaNome="ClinicaPlus"
        pacienteNome={selectedPaciente?.nome || 'Paciente não especificado'}
        pacienteNumero={selectedPaciente?.numeroPaciente || 'N/A'}
        medicoNome={selectedMedico?.nome.startsWith('Dr') ? selectedMedico.nome : `Dr. ${selectedMedico?.nome}`}
        especialidade={selectedSpecialty}
        tipoAgendamento={tipo}
        dataHora={`${selectedDate}T${selectedTime || '00:00'}`}
      />
    </div>
  );
};
