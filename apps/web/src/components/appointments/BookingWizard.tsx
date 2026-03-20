import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useUIStore } from '../../stores/ui.store';
import { 
  AgendamentoCreateSchema, 
  type AgendamentoCreateInput, 
  TipoAgendamento 
} from '@clinicaplus/types';

import { useMedicos, useSlots } from '../../hooks/useMedicos';
import { useCreateAgendamento } from '../../hooks/useAgendamentos';
import { useListaPacientes } from '../../hooks/usePacientes';
import { useEspecialidades } from '../../hooks/useEspecialidades';
import { combineDateAndTime } from '@clinicaplus/utils';

// Sub-components
import { StepPatient } from './booking/StepPatient';
import { StepSpecialty } from './booking/StepSpecialty';
import { StepMedico } from './booking/StepMedico';
import { StepSlots } from './booking/StepSlots';
import { StepConfirmation } from './booking/StepConfirmation';
import { StepSuccess } from './booking/StepSuccess';

interface BookingWizardProps {
  pacienteId?: string | undefined; // If provided, skips the Patient selection step
  onSuccess?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  isStaff?: boolean | undefined;
}

/**
 * Step Indicator component for the booking wizard
 */
function StepIndicator({ currentStep, hasPatientStep }: { currentStep: number; hasPatientStep: boolean }) {
  const steps = [
    ...(hasPatientStep ? [{ num: 0, label: 'Paciente' }] : []),
    { num: 1, label: 'Especialidade' },
    { num: 2, label: 'Médico' },
    { num: 3, label: 'Data & Hora' },
    { num: 4, label: 'Confirmação' }
  ];

  // Adjust display numbers to be 1-based correctly
  const displaySteps = steps.map((s, i) => ({ ...s, displayNum: i + 1 }));

  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-6 md:mb-10 px-2 sm:px-4">
      {displaySteps.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center gap-1.5 md:gap-2 relative z-10">
            <div className={`
              w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-sm
              ${currentStep === step.num 
                ? 'bg-primary-600 text-white ring-4 ring-primary-100 scale-110' 
                : currentStep > step.num || (currentStep === -1 && step.num === 5)
                  ? 'bg-success-500 text-white shadow-success-100' 
                  : 'bg-white text-neutral-400 border border-neutral-200'
              }
            `}>
              {currentStep > step.num ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : step.displayNum}
            </div>
            <span className={`hidden sm:block text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${currentStep === step.num ? 'text-primary-700' : 'text-neutral-400'}`}>
              {step.label}
            </span>
          </div>
          {idx < displaySteps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 sm:mx-2 -mt-4 sm:-mt-6 transition-colors duration-500 ${currentStep > step.num ? 'bg-success-500' : 'bg-neutral-100'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function BookingWizard({ pacienteId, onSuccess, onCancel, isStaff = false }: BookingWizardProps) {
  // If it's a patient (not staff), we ALWAYS skip the patient selection step (Step 0)
  // regardless of whether pacienteId is specifically passed yet.
  const hasPatientStep = isStaff && !pacienteId;
  const [step, setStep] = useState(hasPatientStep ? 0 : 1);
  
  // Selection state
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(pacienteId || null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedMedicoId, setSelectedMedicoId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA') || ''); // en-CA is guaranteed YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [createdAgendamento, setCreatedAgendamento] = useState<any>(null);

  // Queries
  const { data: pacientes } = useListaPacientes({ page: 1, limit: 100 });
  const { data: especialidadesData, isLoading: loadingSpecialties } = useEspecialidades({ ativo: true, limit: 100 });
  
  const { data: medicos, isLoading: loadingMedicos } = useMedicos({ 
    especialidadeId: (selectedSpecialty as string) || undefined,
    ativo: true,
    page: 1,
    limit: 100
  });
  
  const selectedSpecialtyObj = especialidadesData?.items?.find(s => s.id === selectedSpecialty);
  const selectedSpecialtyName = selectedSpecialtyObj?.nome || null;
  
  const selectedMedico = medicos?.items?.find(m => m.id === selectedMedicoId);
  const selectedPaciente = pacientes?.items?.find(p => p.id === selectedPacienteId);
  
  const { data: slots, isLoading: loadingSlots } = useSlots(selectedMedicoId ?? '', selectedDate ?? '');

  const createAgendamento = useCreateAgendamento();

  const form = useForm<AgendamentoCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(AgendamentoCreateSchema) as any,
    defaultValues: {
      pacienteId: pacienteId || '',
      medicoId: '',
      dataHora: '',
      tipo: TipoAgendamento.CONSULTA,
      motivoConsulta: ''
    }
  });

  // Sync selectedPacienteId if it was null but now we have it (e.g. patient portal hydration)
  React.useEffect(() => {
    if (pacienteId) {
      setSelectedPacienteId(pacienteId);
      form.setValue('pacienteId', pacienteId);
    }
  }, [pacienteId, form]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const onFormSubmit = form.handleSubmit(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (data: any) => {
      if (!selectedMedicoId || !selectedTime || !selectedPacienteId) {
        useUIStore.getState().addToast({ type: 'error', title: 'Erro', message: 'Por favor, verifique todos os detalhes do agendamento.' });
        return;
      }
      
      try {
        const result = await createAgendamento.mutateAsync({
          ...data,
          pacienteId: selectedPacienteId,
          medicoId: selectedMedicoId,
          dataHora: combineDateAndTime(selectedDate, selectedTime).toISOString(),
          ...(isStaff && { estado: 'CONFIRMADO' })
        });
        setCreatedAgendamento(result);
        setStep(5); // To success step
        // onSuccess?() moves to StepSuccess onFinish
      } catch {
        // Erro já tratado pelo interceptor ou toast local no hook
        return;
      }
    },
    (errors) => {
      // Erros de validação já mostrados via toast abaixo
      const firstError = Object.values(errors)[0];
      if (firstError) {
        useUIStore.getState().addToast({ type: 'error', title: 'Erro', message: `Erro de validação: ${firstError.message || 'Verifique os dados'}` });
      }
    }
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full py-4">
      {step < 5 && <StepIndicator currentStep={step} hasPatientStep={hasPatientStep} />}

      {step === 0 && (
        <StepPatient 
          onSelect={(id) => {
            setSelectedPacienteId(id);
            form.setValue('pacienteId', id);
            nextStep();
          }}
          onNewPatient={() => {
            // Futuro: Modal para registar paciente
            useUIStore.getState().addToast({ type: 'info', title: 'Info', message: 'Funcionalidade de novo paciente em breve' });
          }}
        />
      )}

      {step === 1 && (
        <StepSpecialty 
          specialties={especialidadesData?.items}
          loading={loadingSpecialties}
          onSelect={(specialtyId) => {
            setSelectedSpecialty(specialtyId);
            nextStep();
          }}
          onBack={!pacienteId ? prevStep : undefined}
        />
      )}

      {step === 2 && (
        <StepMedico 
          medicos={medicos?.items}
          loading={loadingMedicos}
          selectedSpecialty={selectedSpecialtyName}
          onSelect={(id) => {
            setSelectedMedicoId(id);
            form.setValue('medicoId', id);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {step === 3 && (
        <StepSlots 
          selectedMedico={selectedMedico}
          selectedSpecialty={selectedSpecialtyName}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          slots={slots}
          loading={loadingSlots}
          onDateChange={setSelectedDate}
          onSelectTime={(time) => {
            setSelectedTime(time);
            const isoString = new Date(`${selectedDate}T${time}`).toISOString();
            form.setValue('dataHora', isoString);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {step === 4 && (
        <StepConfirmation 
          selectedMedico={selectedMedico}
          selectedPaciente={selectedPaciente}
          selectedSpecialty={selectedSpecialtyName}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form={form as any}
          isPending={createAgendamento.isPending}
          onSubmit={onFormSubmit}
          onBack={prevStep}
        />
      )}

      {step === 5 && (
        <StepSuccess 
          isStaff={isStaff}
          selectedMedico={createdAgendamento?.medico ?? selectedMedico}
          selectedPaciente={createdAgendamento?.paciente ?? selectedPaciente}
          tipo={form.getValues('tipo')}
          selectedSpecialty={selectedSpecialtyName}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onFinish={() => {
            onSuccess?.();
            if (onCancel) onCancel();
            else window.location.reload(); 
          }}
        />
      )}
    </div>
  );
}
