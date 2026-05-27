import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@clinicaplus/ui';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    title: 'Bem-vindo ao ClinicaPlus',
    description: 'A sua plataforma de gestão de clínicas privadas em Angola.',
    icon: '🏥',
  },
  {
    title: 'Agendamentos',
    description: 'Gerencie agendamentos, consultas e horários de forma simples e eficiente.',
    icon: '📅',
  },
  {
    title: 'Pacientes',
    description: 'Mantenha o registo completo dos seus pacientes, incluindo histórico médico.',
    icon: '👥',
  },
  {
    title: 'Faturação',
    description: 'Emita faturas e gere relatórios fiscais em conformidade com a AGT.',
    icon: '📄',
  },
  {
    title: 'Pronto para começar',
    description: 'Você está pronto para usar todas as funcionalidades do ClinicaPlus.',
    icon: '✅',
  },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed and redirect to dashboard
      // TODO: Use proper storage utility instead of localStorage
      // localStorage.setItem('onboardingCompleted', 'true');
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    // TODO: Use proper storage utility instead of localStorage
    // localStorage.setItem('onboardingCompleted', 'true');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Content card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{steps[currentStep]?.icon}</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {steps[currentStep]?.title}
            </h1>
            <p className="text-slate-600">{steps[currentStep]?.description}</p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-slate-600 hover:text-slate-900"
            >
              Saltar
            </Button>
            <Button onClick={handleNext} className="gap-2">
              {currentStep === steps.length - 1 ? 'Começar' : 'Próximo'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          {currentStep + 1} de {steps.length}
        </p>
      </div>
    </div>
  );
}
