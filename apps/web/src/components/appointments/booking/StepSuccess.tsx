import React, { useRef } from 'react';
import { Button, Card } from '@clinicaplus/ui';
import { CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { formatDate } from '@clinicaplus/utils';
import type { MedicoDTO, PacienteDTO } from '@clinicaplus/types';
import { ComprovativoAgendamentoPrint } from '../../print/ComprovativoAgendamentoPrint';
import { useClinicaMe } from '../../../hooks/useClinicas';

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
  const { data: clinica } = useClinicaMe();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };
  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-10 animate-in zoom-in duration-700">
      <div className="w-20 h-20 bg-success-600 text-white flex items-center justify-center mx-auto shadow-premium ring-8 ring-success-50">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-black text-neutral-900 tracking-tighter uppercase">Agendamento Concluído</h1>
        <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">O registo foi processado com sucesso no sistema.</p>
      </div>

      <Card className="p-10 rounded-none bg-neutral-900 text-white text-left relative overflow-hidden group border-none">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 group-hover:bg-white/10 transition-colors duration-1000" />
        
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400 mb-2">Comprovativo Técnico</p>
            <h3 className="text-2xl font-black italic uppercase tracking-tight">
              {selectedMedico?.nome.startsWith('Dr') ? selectedMedico.nome : `Dr. ${selectedMedico?.nome}`}
            </h3>
            <p className="text-primary-400 font-mono text-xs uppercase tracking-widest mt-1">{selectedSpecialty}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 pt-8 border-t border-white/10">
            <div>
              <p className="text-xs font-black uppercase text-neutral-400 tracking-widest mb-1">Data</p>
              <p className="font-mono font-bold">{formatDate(selectedDate)}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-neutral-400 tracking-widest mb-1">Horário</p>
              <p className="font-mono font-bold">{selectedTime}</p>
            </div>
          </div>

          <div className="pt-6 flex items-start gap-4 text-xs text-neutral-300 bg-white/5 p-5 uppercase tracking-wider leading-relaxed">
            <AlertCircle className="w-4 h-4 text-warning-500 shrink-0" />
            <p>Atenção: Por favor, {isStaff ? 'instrua o paciente a chegar' : 'apresente-se na recepção'} 15 minutos antes do horário especificado.</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {onViewAppointments && (
          <Button 
            className="w-full h-16 rounded-none font-black text-sm uppercase tracking-widest bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50"
            onClick={onViewAppointments}
          >
            {isStaff ? 'Painel de Agendamentos' : 'Meus Agendamentos'}
          </Button>
        )}
        <Button 
          variant="secondary"
          className="w-full h-16 rounded-none font-black text-sm uppercase tracking-widest bg-primary-900 text-white hover:bg-black border-none flex items-center justify-center gap-3"
          onClick={handlePrint}
        >
          <Printer className="w-5 h-5" />
          Imprimir documento
        </Button>
        <Button 
          variant="ghost" 
          className="text-neutral-500 font-mono text-xs uppercase tracking-widest mt-2"
          onClick={onFinish}
        >
          {isStaff ? 'Fechar Assistente' : 'Voltar ao Dashboard'}
        </Button>
      </div>

      {/* Hidden Print Component */}
      <ComprovativoAgendamentoPrint 
        ref={printRef}
        clinicaNome={clinica?.nome || 'ClinicaPlus'}
        clinicaEndereco={clinica?.endereco || null}
        clinicaTelefone={clinica?.telefone || null}
        clinicaLogoUrl={clinica?.logotipoUrl || null}
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
