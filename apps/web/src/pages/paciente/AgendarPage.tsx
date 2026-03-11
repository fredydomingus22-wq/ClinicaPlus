import { useAuthStore } from '../../stores/auth.store';
import { BookingWizard } from '../../components/appointments/BookingWizard';
import { useNavigate } from 'react-router-dom';

export default function AgendarPage() {
  const { utilizador } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8">
      <BookingWizard 
        pacienteId={utilizador?.paciente?.id as string | undefined}
        onSuccess={undefined}
        onCancel={() => navigate('/paciente/dashboard')}
      />
    </div>
  );
}
